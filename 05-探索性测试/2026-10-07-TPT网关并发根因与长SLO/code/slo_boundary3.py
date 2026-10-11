"""Round-3 TPT gateway probe: server-side concurrency proxy, 1600 root cause, long-request SLO.

Plans:
  root    : (B) phased non-pooled 800..1600 (+100, stop at systematic failure) and
            pooled TCPConnector(limit=200) at 800/1600; recovery checks.
  longc   : (C) long 30/50/75/100/150/200 x3 (long input, max_tokens 512).
  densify : (D) short 110/115/120/245/248 x5.
  all     : root + longc + densify.

Adds per-second in-flight sampling per wave (app-level vs connection-level) and a
process resource time series (CPU / RSS / handles / TCP conns). No retries.
"""
import argparse, asyncio, collections, gzip, hashlib, json, math, platform, threading, time
from datetime import datetime, timezone, timedelta
from pathlib import Path
import aiohttp
import psutil

TASK = Path(__file__).resolve().parents[1]
ROOT = TASK.parents[1]
CFG = json.loads((ROOT / '04-测试项/saas-llm-test/archive/v1/llm-bench-kit/config.json').read_text(encoding='utf-8'))
TARGET = next(t for t in CFG['targets'] if t['name'] == 'flash-public-low')
URL = TARGET['base_url'].rstrip('/') + '/chat/completions'
HEADERS = {'Authorization': 'Bearer ' + TARGET['api_key']}

SHORT_PROMPT = 'Reply with exactly OK. Do not explain.'
LONG_FILLER = ('The quick brown fox jumps over the lazy dog. ' * 170)
LONG_PROMPT = (LONG_FILLER + '\n\nUsing the passage above only as context, write a detailed '
               'explanation of why short requests can saturate a gateway. Aim for about 500 '
               'words and do not stop early.')

NOPOOL_LADDER = list(range(800, 1601, 100))
POOL_LIMIT = 200
LONG_LADDER = [30, 50, 75, 100, 150, 200]
DENSE_SHORT = [110, 115, 120, 245, 248]
SYSTEMATIC_FAIL_RATE = 0.01
BEIJING = timezone(timedelta(hours=8))
RUN_LOG = []
HTTP_REQUESTS = 0
RES_SERIES = []
RES_STOP = threading.Event()


def now_pair():
    utc = datetime.now(timezone.utc)
    return utc.isoformat(timespec='milliseconds'), utc.astimezone(BEIJING).isoformat(timespec='milliseconds')


def resource_sampler():
    p = psutil.Process()
    p.cpu_percent(None)
    while not RES_STOP.is_set():
        try:
            try:
                conns = len([c for c in p.net_connections(kind='tcp') if c.status != psutil.CONN_LISTEN])
            except Exception:
                conns = None
            handles = p.num_handles() if hasattr(p, 'num_handles') else None
            RES_SERIES.append({'utc': datetime.now(timezone.utc).isoformat(timespec='milliseconds'),
                               'cpu_percent': p.cpu_percent(None),
                               'rss_mb': round(p.memory_info().rss / 1_000_000, 2),
                               'handles': handles, 'tcp_conns': conns})
        except Exception:
            pass
        RES_STOP.wait(1)


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
    path.write_text(json.dumps(sorted(merged.values(), key=lambda e: e['utc_start']), ensure_ascii=False, indent=2),
                    encoding='utf-8')


def pct(vals, q):
    if not vals:
        return None
    s = sorted(vals)
    return round(s[max(0, math.ceil(q / 100.0 * len(s)) - 1)], 6)


def stats(vals):
    vals = [v for v in vals if v is not None]
    if not vals:
        return None
    return {'n': len(vals), 'mean': round(sum(vals) / len(vals), 6), 'p50': pct(vals, 50),
            'p95': pct(vals, 95), 'p99': pct(vals, 99), 'min': round(min(vals), 6), 'max': round(max(vals), 6)}


async def wave(n, label, prompt, max_tokens, conn_limit, gap):
    global HTTP_REQUESTS
    HTTP_REQUESTS += n
    rows = []
    series = []
    counters = {'started': 0, 'finished': 0, 'sent_active': 0, 'accepted_active': 0, 'sent_peak': 0, 'accepted_peak': 0}
    running = True
    start = time.perf_counter()
    trace = aiohttp.TraceConfig()

    async def sent(session, ctx, params):
        counters['sent_active'] += 1
        counters['sent_peak'] = max(counters['sent_peak'], counters['sent_active'])
        ctx.trace_request_ctx['sent_at'] = time.perf_counter() - start

    trace.on_request_headers_sent.append(sent)

    async def sampler():
        while running:
            series.append({'t': round(time.perf_counter() - start, 3),
                           'app_inflight': counters['started'] - counters['finished'],
                           'conn_inflight': counters['sent_active'],
                           'accepted_inflight': counters['accepted_active']})
            await asyncio.sleep(1)

    connector = aiohttp.TCPConnector(limit=conn_limit, ttl_dns_cache=600)
    timeout = aiohttp.ClientTimeout(total=180, connect=60, sock_read=90)
    utc0, bj0 = now_pair()
    async with aiohttp.ClientSession(connector=connector, timeout=timeout,
                                     trust_env=False, trace_configs=[trace]) as session:
        async def one(i):
            counters['started'] += 1
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
                    row.update(status=response.status, headers_at=time.perf_counter() - start,
                               response_headers=dict(response.headers))
                    if response.status == 200:
                        counters['accepted_active'] += 1
                        is_accepted = True
                        counters['accepted_peak'] = max(counters['accepted_peak'], counters['accepted_active'])
                    async for chunk in response.content.iter_any():
                        if chunk and 'first_bytes_at' not in row:
                            row['first_bytes_at'] = time.perf_counter() - start
                        raw.extend(chunk)
                    row['read_complete'] = True
            except Exception as exc:
                row.update(error_type=type(exc).__name__, error=str(exc))
            finally:
                if is_accepted:
                    counters['accepted_active'] -= 1
                if 'sent_at' in row:
                    counters['sent_active'] -= 1
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
                counters['finished'] += 1
                rows.append(row)

        task = asyncio.ensure_future(sampler())
        await asyncio.gather(*(one(i) for i in range(n)))
        running = False
        await task

    duration = time.perf_counter() - start
    utc1, bj1 = now_pair()
    result = {
        'label': label, 'planned': n, 'conn_limit': conn_limit,
        'headers_sent_peak': counters['sent_peak'], 'http200_unfinished_peak': counters['accepted_peak'],
        'duration': duration,
        'statuses': dict(collections.Counter(str(r.get('status', 'no_http_status')) for r in rows)),
        'complete': sum(r['complete'] for r in rows),
        'client_errors': dict(collections.Counter(r['error_type'] for r in rows if r.get('error_type'))),
        'inflight_series': series, 'rows': sorted(rows, key=lambda r: r['id']),
    }
    (TASK / f'{label}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    fail_rate = round((n - result['complete']) / n, 6)
    RUN_LOG.append({'label': label, 'planned': n, 'complete': result['complete'], 'failure_rate': fail_rate,
                    'statuses': result['statuses'], 'client_errors': result['client_errors'],
                    'conn_limit': conn_limit, 'duration_s': round(duration, 3),
                    'utc_start': utc0, 'utc_end': utc1, 'beijing_start': bj0, 'beijing_end': bj1})
    print(json.dumps({k: v for k, v in result.items() if k not in ('rows', 'inflight_series')}, ensure_ascii=False), flush=True)
    dump_run_log()
    await asyncio.sleep(gap)
    return result


def systematic(r):
    rate = (r['planned'] - r['complete']) / r['planned']
    has5xx = any(str(s).startswith('5') for s in r['statuses'])
    return rate >= SYSTEMATIC_FAIL_RATE or has5xx


async def recovery(tag, gap):
    global HTTP_REQUESTS
    HTTP_REQUESTS += 1
    label = f'recovery-{tag}'
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
    result = {'label': label, 'planned': 1, 'conn_limit': 1, 'headers_sent_peak': 1,
              'http200_unfinished_peak': 1, 'duration': duration,
              'statuses': {str(row.get('status', 'no_http_status')): 1},
              'complete': int(row['complete']),
              'client_errors': ({row['error_type']: 1} if row.get('error_type') else {}),
              'inflight_series': [], 'rows': [row]}
    (TASK / f'{label}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    RUN_LOG.append({'label': label, 'planned': 1, 'complete': result['complete'],
                    'failure_rate': 1 - result['complete'], 'statuses': result['statuses'],
                    'client_errors': result['client_errors'], 'conn_limit': 1,
                    'duration_s': round(duration, 3),
                    'utc_start': utc0, 'utc_end': utc1, 'beijing_start': bj0, 'beijing_end': bj1})
    print(json.dumps({k: v for k, v in result.items() if k not in ('rows', 'inflight_series')}, ensure_ascii=False), flush=True)
    dump_run_log()
    await asyncio.sleep(gap)
    return result


async def plan_root(gap, reps):
    # B1: pooled comparison at 800 and 1600 first (clean machine state)
    for n in (800, 1600):
        for k in range(1, reps + 1):
            await wave(n, f'wave-{n}-pool{POOL_LIMIT}-{k}', SHORT_PROMPT, 128, POOL_LIMIT, gap)
    # B2: phased non-pooled from 800, +100, stop at first systematic failure
    for n in NOPOOL_LADDER:
        r = await wave(n, f'wave-{n}-nopool', SHORT_PROMPT, 128, n, gap)
        if systematic(r):
            print(f'SYSTEMATIC FAILURE at nopool n={n} rate={1 - r["complete"]/r["planned"]:.4f}', flush=True)
            await recovery(f'nopool-{n}', gap)
            break


async def plan_longc(gap, reps):
    for n in LONG_LADDER:
        for k in range(1, reps + 1):
            await wave(n, f'long-{n}-{k}', LONG_PROMPT, 512, n, gap)


async def plan_densify(gap, reps):
    for n in DENSE_SHORT:
        for k in range(1, reps + 1):
            await wave(n, f'wave-{n}-{k}', SHORT_PROMPT, 128, n, gap)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--plan', choices=['root', 'longc', 'densify', 'all', 'smoke'], required=True)
    ap.add_argument('--gap', type=float, default=30.0)
    ap.add_argument('--reps', type=int, default=0)
    args = ap.parse_args()
    (TASK / 'responses').mkdir(parents=True, exist_ok=True)

    sampler = threading.Thread(target=resource_sampler, daemon=True)
    sampler.start()
    print(f'START plan={args.plan} gap={args.gap} utc={now_pair()[0]}', flush=True)
    try:
        if args.plan == 'smoke':
            await wave(3, 'smoke-3', SHORT_PROMPT, 128, 3, args.gap)
            await wave(4, 'wave-4-pool200-1', SHORT_PROMPT, 128, 2, args.gap)
            await recovery('smoke', args.gap)
        if args.plan in ('root', 'all'):
            await plan_root(args.gap, args.reps or 2)
        if args.plan in ('longc', 'all'):
            await plan_longc(args.gap, args.reps or 3)
        if args.plan in ('densify', 'all'):
            await plan_densify(args.gap, args.reps or 5)
    finally:
        RES_STOP.set()
        sampler.join(timeout=5)
        (TASK / 'resource-timeseries.json').write_text(
            json.dumps(RES_SERIES, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'DONE requests={HTTP_REQUESTS} utc={now_pair()[0]}', flush=True)


if __name__ == '__main__':
    asyncio.run(main())
