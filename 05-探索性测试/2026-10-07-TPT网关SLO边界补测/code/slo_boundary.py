"""TPT gateway short-request SLO boundary convergence run.

Plans:
  short : ladder 250/300/350/400/500/600, 3 reps each, 128-token reply
  fail  : 1600 x3, then 30s wait + single-request recovery
  long  : 50/100/200 x2, ~2048-token input, 512-token output
  smoke : tiny 3-request wave + recovery, to validate code only

No retries. Drain each wave, then wait --gap seconds before the next one.
Independent connections (pool limit = N). Records per-request rows, events and
raw/partial responses; writes per-wave JSON plus a run-log of precise wall-clock
start/end (UTC + Asia/Shanghai) for later server-log correlation.
"""
import argparse, asyncio, collections, gzip, hashlib, json, math, platform, time
from datetime import datetime, timezone, timedelta
from pathlib import Path
import aiohttp

TASK = Path(__file__).resolve().parents[1]
ROOT = TASK.parents[1]
CFG = json.loads((ROOT / '04-测试项/saas-llm-test/archive/v1/llm-bench-kit/config.json').read_text(encoding='utf-8'))
TARGET = next(t for t in CFG['targets'] if t['name'] == 'flash-public-low')
URL = TARGET['base_url'].rstrip('/') + '/chat/completions'
HEADERS = {'Authorization': 'Bearer ' + TARGET['api_key']}

SHORT_PROMPT = 'Reply with exactly OK. Do not explain.'
# ~2048 input tokens of neutral English filler (approx 4 chars/token).
LONG_FILLER = ('The quick brown fox jumps over the lazy dog. ' * 170)
LONG_PROMPT = (LONG_FILLER + '\n\nUsing the passage above only as context, write a detailed '
               'explanation of why short requests can saturate a gateway. Aim for about 500 '
               'words and do not stop early.')

SHORT_LADDER = [250, 300, 350, 400, 500, 600]
LONG_LADDER = [50, 100, 200]
FAIL_N = 1600
BEIJING = timezone(timedelta(hours=8))
RUN_LOG = []
HTTP_REQUESTS = 0


def now_pair():
    utc = datetime.now(timezone.utc)
    bj = utc.astimezone(BEIJING)
    return utc.isoformat(timespec='milliseconds'), bj.isoformat(timespec='milliseconds')


def dump_run_log():
    path = TASK / 'run-log.json'
    existing = []
    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding='utf-8'))
        except Exception:
            existing = []
    merged = {e['label']: e for e in existing}
    for e in RUN_LOG:
        merged[e['label']] = e
    out = sorted(merged.values(), key=lambda e: e['utc_start'])
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def pct(vals, q):
    if not vals:
        return None
    s = sorted(vals)
    k = max(0, math.ceil(q / 100.0 * len(s)) - 1)
    return round(s[k], 6)


def stats(vals):
    vals = [v for v in vals if v is not None]
    if not vals:
        return None
    return {
        'n': len(vals),
        'mean': round(sum(vals) / len(vals), 6),
        'p50': pct(vals, 50),
        'p95': pct(vals, 95),
        'p99': pct(vals, 99),
        'min': round(min(vals), 6),
        'max': round(max(vals), 6),
    }


async def wave(n, label, prompt, max_tokens, gap):
    """Fire n requests concurrently, drain all, return result dict."""
    global HTTP_REQUESTS
    HTTP_REQUESTS += n
    rows = []
    events = []
    sent_active = sent_peak = accepted = accepted_peak = 0
    start = time.perf_counter()
    trace = aiohttp.TraceConfig()

    async def sent(session, ctx, params):
        nonlocal sent_active, sent_peak
        row = ctx.trace_request_ctx
        row['sent_at'] = time.perf_counter() - start
        sent_active += 1
        sent_peak = max(sent_peak, sent_active)
        events.append({'t': row['sent_at'], 'id': row['id'], 'event': 'headers_sent'})

    trace.on_request_headers_sent.append(sent)
    connector = aiohttp.TCPConnector(limit=n, ttl_dns_cache=600)
    timeout = aiohttp.ClientTimeout(total=180, connect=60, sock_read=90)
    utc0, bj0 = now_pair()
    async with aiohttp.ClientSession(connector=connector, timeout=timeout,
                                     trust_env=False, trace_configs=[trace]) as session:
        async def one(i):
            nonlocal sent_active, accepted, accepted_peak
            row = {'id': f'{label}-{i:04d}', 'start': time.perf_counter() - start, 'complete': False}
            body = {'model': 'flash', 'think_level': 'low',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'max_tokens': max_tokens, 'stream': True,
                    'stream_options': {'include_usage': True}}
            raw = bytearray()
            is_accepted = False
            try:
                async with session.post(URL, headers=HEADERS, json=body,
                                        trace_request_ctx=row) as response:
                    row.update(status=response.status,
                               headers_at=time.perf_counter() - start,
                               response_headers=dict(response.headers))
                    if response.status == 200:
                        accepted += 1
                        is_accepted = True
                        accepted_peak = max(accepted_peak, accepted)
                    async for chunk in response.content.iter_any():
                        if chunk and 'first_bytes_at' not in row:
                            row['first_bytes_at'] = time.perf_counter() - start
                        raw.extend(chunk)
                    row['read_complete'] = True
            except Exception as exc:
                row.update(error_type=type(exc).__name__, error=str(exc))
            finally:
                if is_accepted:
                    accepted -= 1
                if 'sent_at' in row:
                    sent_active -= 1
                row['end'] = time.perf_counter() - start
                events.append({'t': row['end'], 'id': row['id'], 'event': 'end'})
                text = raw.decode('utf-8', errors='replace')
                row['done'] = '[DONE]' in text
                row['usage'] = None
                row['stream_errors'] = []
                row['finish_reasons'] = []
                for line in text.splitlines():
                    if line.startswith('data: '):
                        try:
                            obj = json.loads(line[6:])
                            if obj.get('usage'):
                                row['usage'] = obj['usage']
                            if obj.get('error'):
                                row['stream_errors'].append(obj['error'])
                            for choice in obj.get('choices', []):
                                if choice.get('finish_reason'):
                                    row['finish_reasons'].append(choice['finish_reason'])
                        except ValueError:
                            pass
                if row.get('status') != 200:
                    row['error_body'] = text[:16384]
                row['complete'] = (row.get('status') == 200 and row['done']
                                   and not row['stream_errors'] and not row.get('error_type')
                                   and bool(row['finish_reasons']))
                row['response_sha256'] = hashlib.sha256(raw).hexdigest().upper()
                row['response_path'] = f"responses/{row['id']}.sse.gz"
                (TASK / row['response_path']).write_bytes(gzip.compress(raw, mtime=0))
                rows.append(row)

        await asyncio.gather(*(one(i) for i in range(n)))

    duration = time.perf_counter() - start
    utc1, bj1 = now_pair()
    result = {
        'label': label, 'planned': n, 'headers_sent_peak': sent_peak,
        'http200_unfinished_peak': accepted_peak, 'duration': duration,
        'statuses': dict(collections.Counter(str(r.get('status', 'no_http_status')) for r in rows)),
        'complete': sum(r['complete'] for r in rows),
        'client_errors': dict(collections.Counter(r['error_type'] for r in rows if r.get('error_type'))),
        'rows': sorted(rows, key=lambda r: r['id']),
        'events': sorted(events, key=lambda e: e['t']),
    }
    (TASK / f'{label}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    RUN_LOG.append({'label': label, 'planned': n, 'complete': result['complete'],
                    'statuses': result['statuses'], 'client_errors': result['client_errors'],
                    'duration_s': round(duration, 3),
                    'utc_start': utc0, 'utc_end': utc1, 'beijing_start': bj0, 'beijing_end': bj1})
    print(json.dumps({k: v for k, v in result.items() if k not in ('rows', 'events')}, ensure_ascii=False), flush=True)
    dump_run_log()
    await asyncio.sleep(gap)
    return result


async def recovery(k, gap):
    global HTTP_REQUESTS
    HTTP_REQUESTS += 1
    label = f'recovery-{k}'
    utc0, bj0 = now_pair()
    start = time.perf_counter()
    timeout = aiohttp.ClientTimeout(total=180, connect=60, sock_read=90)
    row = {'id': f'{label}-0000', 'start': 0.0, 'complete': False}
    raw = bytearray()
    async with aiohttp.ClientSession(timeout=timeout, trust_env=False) as session:
        body = {'model': 'flash', 'think_level': 'low',
                'messages': [{'role': 'user', 'content': SHORT_PROMPT}],
                'max_tokens': 128, 'stream': True, 'stream_options': {'include_usage': True}}
        try:
            async with session.post(URL, headers=HEADERS, json=body) as response:
                row.update(status=response.status, headers_at=time.perf_counter() - start)
                async for chunk in response.content.iter_any():
                    if chunk and 'first_bytes_at' not in row:
                        row['first_bytes_at'] = time.perf_counter() - start
                    raw.extend(chunk)
                row['read_complete'] = True
        except Exception as exc:
            row.update(error_type=type(exc).__name__, error=str(exc))
        finally:
            row['end'] = time.perf_counter() - start
            text = raw.decode('utf-8', errors='replace')
            row['done'] = '[DONE]' in text
            row['usage'] = None
            row['stream_errors'] = []
            row['finish_reasons'] = []
            for line in text.splitlines():
                if line.startswith('data: '):
                    try:
                        obj = json.loads(line[6:])
                        if obj.get('usage'):
                            row['usage'] = obj['usage']
                        if obj.get('error'):
                            row['stream_errors'].append(obj['error'])
                        for choice in obj.get('choices', []):
                            if choice.get('finish_reason'):
                                row['finish_reasons'].append(choice['finish_reason'])
                    except ValueError:
                        pass
            if row.get('status') != 200:
                row['error_body'] = text[:16384]
            row['complete'] = (row.get('status') == 200 and row['done'] and not row['stream_errors']
                               and not row.get('error_type') and bool(row['finish_reasons']))
            row['response_sha256'] = hashlib.sha256(raw).hexdigest().upper()
            row['response_path'] = f"responses/{row['id']}.sse.gz"
            (TASK / row['response_path']).write_bytes(gzip.compress(raw, mtime=0))
    duration = time.perf_counter() - start
    utc1, bj1 = now_pair()
    result = {'label': label, 'planned': 1, 'headers_sent_peak': 1,
              'http200_unfinished_peak': 1, 'duration': duration,
              'statuses': {str(row.get('status', 'no_http_status')): 1},
              'complete': int(row['complete']),
              'client_errors': ({row['error_type']: 1} if row.get('error_type') else {}),
              'rows': [row], 'events': [{'t': row['end'], 'id': row['id'], 'event': 'end'}]}
    (TASK / f'{label}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    RUN_LOG.append({'label': label, 'planned': 1, 'complete': result['complete'],
                    'statuses': result['statuses'], 'client_errors': result['client_errors'],
                    'duration_s': round(duration, 3),
                    'utc_start': utc0, 'utc_end': utc1, 'beijing_start': bj0, 'beijing_end': bj1})
    print(json.dumps({k: v for k, v in result.items() if k not in ('rows', 'events')}, ensure_ascii=False), flush=True)
    dump_run_log()
    return result


async def plan_short(gap, reps, extra, only=None):
    ladder = sorted(set(only)) if only else sorted(set(SHORT_LADDER + extra))
    for n in ladder:
        for k in range(1, reps + 1):
            await wave(n, f'wave-{n}-{k}', SHORT_PROMPT, 128, gap)


async def plan_fail(gap, reps):
    for k in range(1, reps + 1):
        await wave(FAIL_N, f'wave-{FAIL_N}-{k}', SHORT_PROMPT, 128, gap)
        await recovery(k, 0)
        if k < reps:
            await asyncio.sleep(gap)


async def plan_long(gap, reps):
    for n in LONG_LADDER:
        for k in range(1, reps + 1):
            await wave(n, f'long-{n}-{k}', LONG_PROMPT, 512, gap)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--plan', choices=['short', 'fail', 'long', 'all', 'smoke'], required=True)
    ap.add_argument('--gap', type=float, default=30.0)
    ap.add_argument('--reps', type=int, default=0)
    ap.add_argument('--extra', type=int, nargs='*', default=[])
    ap.add_argument('--only', type=int, nargs='*', default=[])
    args = ap.parse_args()

    (TASK / 'responses').mkdir(parents=True, exist_ok=True)
    print(f'START plan={args.plan} gap={args.gap} utc={now_pair()[0]}', flush=True)
    if args.plan == 'smoke':
        await wave(3, 'smoke-3', SHORT_PROMPT, 128, args.gap)
        await recovery(0, args.gap)
    elif args.plan == 'short':
        await plan_short(args.gap, args.reps or 3, args.extra, args.only or None)
    elif args.plan == 'fail':
        await plan_fail(args.gap, args.reps or 3)
    elif args.plan == 'long':
        await plan_long(args.gap, args.reps or 2)
    elif args.plan == 'all':
        await plan_short(args.gap, args.reps or 3, args.extra)
        await plan_fail(args.gap, args.reps or 3)
        await plan_long(args.gap, 2)
    print(f'DONE requests={HTTP_REQUESTS} utc={now_pair()[0]}', flush=True)


if __name__ == '__main__':
    asyncio.run(main())
