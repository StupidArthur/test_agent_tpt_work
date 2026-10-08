"""Task A (续跑 2026-10-08): sustained-window re-check of Responses simple-request
boundaries. Same workload/logic as the archived `code/run_task_a.py` (which is kept
byte-unchanged as historical evidence).

Only differences vs the archived runner:
  * output directory defaults to this round's `results/` (previous round's outputs
    are never overwritten);
  * additionally dumps a compact per-turn `<label>.raw.jsonl` (evidence on disk);
  * `ROOT` is located by walking up to the repo root that contains `04-测试项`.
No business workload / metric / threshold change.

Tiers 55/60/80/85/200/210; per tier 2 independent windows, each >= window_seconds
and >= min_attempts. Burst model: U barrier-synced requests, drain, think 5s, repeat.

Success is layered (docs/06): gateway_service_success = protocol ok AND completed
AND non-empty text; exact-marker mismatch is model/task quality, not gateway failure.
Writes incrementally and is resumable (skips finished windows).
"""
from __future__ import annotations
import argparse, json, math, sys, threading, time, uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import psutil

HERE = Path(__file__).resolve()
ROUND = HERE.parents[1]
TASK = ROUND.parent
ROOT = next(p for p in HERE.parents if (p / '04-测试项').is_dir())
CODE = ROOT / '04-测试项/saas-llm-test/code'
sys.path.insert(0, str(CODE))
from llm_probe import protocol as P        # noqa: E402
from llm_probe import transport as T       # noqa: E402

CFG = json.loads((ROOT / '04-测试项/saas-llm-test/archive/v1/llm-bench-kit/config.json').read_text(encoding='utf-8'))
TGT = next(t for t in CFG['targets'] if t['name'] == 'flash-public-low')
URL = TGT['base_url'].rstrip('/') + '/responses'
KEY = TGT['api_key']
MODEL, EFFORT, MAX_OUT = 'flash', 'low', 256
BEIJING = timezone(timedelta(hours=8))
TIMEOUTS = {'connect': 15.0, 'idle': 60.0, 'total': 180.0}
THRESH = {55: 3, 60: 3, 80: 5, 85: 5, 200: 10, 210: 10}
OUT = ROUND / 'results'


def now():
    u = datetime.now(timezone.utc)
    return u.isoformat(timespec='milliseconds'), u.astimezone(BEIJING).isoformat(timespec='milliseconds')


def headers():
    return {'Content-Type': 'application/json', 'Accept': 'text/event-stream', 'Authorization': 'Bearer ' + KEY}


def send(body):
    raw = json.dumps(body, ensure_ascii=False).encode('utf-8')
    t0 = time.monotonic()
    res = T.http_request(URL, method='POST', headers=headers(), body=raw, stream=True,
                         connect_timeout=TIMEOUTS['connect'], idle_timeout=TIMEOUTS['idle'], total_timeout=TIMEOUTS['total'])
    t1 = time.monotonic()
    ns = P.normalize(res, 'responses')
    return res, ns, t0, t1


def text_turn():
    marker = 'CAP_' + uuid.uuid4().hex[:12]
    body = P.responses_body(MODEL, text=f'只输出 {marker}', stream=True, max_output_tokens=MAX_OUT, reasoning_effort=EFFORT)
    res, ns, t0, t1 = send(body)
    protocol_ok = res.http_status == 200 and res.error_kind is None and not ns.json_errors and ns.terminal is not None
    text = ns.text or ''
    gw_ok = bool(protocol_ok and ns.terminal == 'completed' and text.strip())
    quality_mismatch = bool(gw_ok and text.strip() != marker)
    cats = []
    if res.http_status == 429:
        cats.append('http_429')
    if res.http_status and res.http_status >= 500:
        cats.append('http_5xx')
    if res.error_kind in ('read_idle_timeout', 'total_timeout'):
        cats.append('timeout')
    if res.error_kind in ('connect', 'dns', 'tls', 'http', 'other'):
        cats.append('connection_error')
    if ns.terminal == 'incomplete':
        cats.append('incomplete')
    elif ns.terminal == 'failed':
        cats.append('protocol_error')
    if protocol_ok is False:
        cats.append('protocol_error')
    if ns.json_errors:
        cats.append('protocol_error')
    return {
        'marker': marker, 'start': t0, 'end': t1,
        'protocol_ok': bool(protocol_ok), 'gateway_service_success': gw_ok, 'model_quality_mismatch': quality_mismatch,
        'http_status': res.http_status, 'error_kind': res.error_kind, 'terminal': ns.terminal,
        'text': text, 'empty_text': (not text.strip()), 'usage': ns.usage,
        'first_text': res.rel(ns.t_first_text), 'cats': sorted(set(cats)),
    }


def burst(U, kind='text'):
    turns = [None] * U
    lock = threading.Lock()
    inflight = {'n': 0, 'peak': 0}
    starts = []
    barrier = threading.Barrier(U)
    proc = psutil.Process()

    def worker(i):
        try:
            barrier.wait(timeout=30)
        except threading.BrokenBarrierError:
            turns[i] = {'gateway_service_success': False, 'error_kind': 'barrier', 'cats': ['client_error'], 'start': time.monotonic(), 'end': time.monotonic()}
            return
        with lock:
            inflight['n'] += 1
            inflight['peak'] = max(inflight['peak'], inflight['n'])
        starts.append(time.monotonic())
        try:
            turns[i] = text_turn()
        except Exception as exc:  # noqa: BLE001
            turns[i] = {'gateway_service_success': False, 'error_kind': 'exception', 'cats': ['client_error'],
                        'err': f'{type(exc).__name__}: {exc}', 'start': time.monotonic(), 'end': time.monotonic()}
        finally:
            with lock:
                inflight['n'] -= 1

    threads = [threading.Thread(target=worker, args=(i,), daemon=True) for i in range(U)]
    w0 = time.monotonic()
    for th in threads:
        th.start()
    for th in threads:
        th.join()
    wall = time.monotonic() - w0
    peak = inflight['peak']
    ok = [t for t in turns if t.get('gateway_service_success')]
    e2e = [round(t['end'] - t['start'], 6) for t in ok]
    first = [t['first_text'] for t in ok if t.get('first_text') is not None]
    cats = {}
    for t in turns:
        for c in (t.get('cats') or []):
            cats[c] = cats.get(c, 0) + 1
    return {
        'planned_concurrency': U, 'actual_peak_in_flight': peak, 'attempted': U,
        'gateway_service_success': len(ok), 'model_quality_mismatch': sum(1 for t in turns if t.get('model_quality_mismatch')),
        'categories': cats, 'wall_clock_s': round(wall, 3),
        'launch_spread_s': round((max(starts) - min(starts)) if starts else 0.0, 6),
        'e2e': e2e, 'first_text': first,
        'turns': turns,
    }


def pct(vals, q):
    if not vals:
        return None
    s = sorted(vals)
    return round(s[max(0, math.ceil(q / 100.0 * len(s)) - 1)], 6)


def stat(vals):
    vals = [v for v in vals if v is not None]
    if not vals:
        return None
    return {'n': len(vals), 'mean': round(sum(vals) / len(vals), 6), 'p50': pct(vals, 50), 'p95': pct(vals, 95), 'max': round(max(vals), 6)}


def run_window(U, window_seconds, min_attempts, think, label):
    path = OUT / f'{label}.json'
    if path.exists():
        prev = None
        try:
            prev = json.loads(path.read_text(encoding='utf-8'))
        except Exception:
            prev = None
        if prev and prev.get('done') and prev.get('attempted', 0) >= min_attempts:
            print(f'skip {label} (complete)', flush=True)
            return prev
        print(f'rerun {label} (partial/incomplete)', flush=True)
    proc = psutil.Process()
    utc0, bj0 = now()
    start = time.monotonic()
    bursts = []
    total_attempts = 0
    res_series = []
    raw_path = OUT / f'{label}.raw.jsonl'
    raw_f = raw_path.open('w', encoding='utf-8')
    try:
        while True:
            b = burst(U)
            bursts.append(b)
            total_attempts += b['attempted']
            for t in b['turns']:
                if t is None:
                    continue
                rec = {k: t.get(k) for k in ('marker', 'protocol_ok', 'gateway_service_success', 'model_quality_mismatch',
                                             'http_status', 'error_kind', 'terminal', 'empty_text', 'first_text', 'cats', 'text')}
                if t.get('start') is not None and t.get('end') is not None:
                    rec['e2e'] = round(t['end'] - t['start'], 6)
                raw_f.write(json.dumps(rec, ensure_ascii=False) + '\n')
            raw_f.flush()
            res_series.append({'t': round(time.monotonic() - start, 3), 'cpu': proc.cpu_percent(None),
                               'rss_mb': round(proc.memory_info().rss / 1e6, 2), 'threads': proc.num_threads(),
                               'tcp': _tcp(proc)})
            elapsed = time.monotonic() - start
            _write(path, label, U, bursts, total_attempts, elapsed, window_seconds, min_attempts, utc0, bj0, res_series, done=False)
            print(json.dumps({'label': label, 'bursts': len(bursts), 'attempts': total_attempts,
                              'elapsed': round(elapsed, 1), 'ok': sum(x['gateway_service_success'] for x in bursts),
                              'peak': b['actual_peak_in_flight']}), flush=True)
            # safety: stop if transport failures > 5% within window
            tot = sum(x['attempted'] for x in bursts)
            trans = sum(x['categories'].get('timeout', 0) + x['categories'].get('connection_error', 0) + x['categories'].get('http_429', 0) + x['categories'].get('http_5xx', 0) for x in bursts)
            if tot and trans / tot > 0.05:
                print(f'STOP {label}: transport failures >5%', flush=True)
                break
            if elapsed >= window_seconds and total_attempts >= min_attempts:
                break
            time.sleep(think)
    finally:
        raw_f.close()
    _write(path, label, U, bursts, total_attempts, time.monotonic() - start, window_seconds, min_attempts, utc0, bj0, res_series, done=True)
    return json.loads(path.read_text(encoding='utf-8'))


def _tcp(proc):
    try:
        return len([c for c in proc.net_connections(kind='tcp') if c.status != psutil.CONN_LISTEN])
    except Exception:
        return None


def _write(path, label, U, bursts, total_attempts, elapsed, window_seconds, min_attempts, utc0, bj0, res_series, done):
    ok = [t for b in bursts for t in b['turns'] if t.get('gateway_service_success')]
    e2e = [round(t['end'] - t['start'], 6) for t in ok]
    first = [t['first_text'] for t in ok if t.get('first_text') is not None]
    cats = {}
    for b in bursts:
        for c, v in b['categories'].items():
            cats[c] = cats.get(c, 0) + v
    attempted = sum(b['attempted'] for b in bursts)
    obj = {
        'label': label, 'planned_concurrency': U, 'done': done,
        'window_seconds_target': window_seconds, 'min_attempts': min_attempts, 'think_time_s': 5,
        'elapsed_s': round(elapsed, 3), 'bursts': len(bursts), 'attempted': attempted,
        'gateway_service_success': len(ok),
        'gateway_service_success_rate': round(len(ok) / attempted * 100, 3) if attempted else None,
        'model_quality_mismatch': sum(b['model_quality_mismatch'] for b in bursts),
        'categories': cats,
        'e2e': stat(e2e), 'first_text': stat(first),
        'peak_in_flight_max': max(b['actual_peak_in_flight'] for b in bursts),
        'min_peak_ratio': round(min(b['actual_peak_in_flight'] / U for b in bursts), 4),
        'max_launch_spread_s': max(b['launch_spread_s'] for b in bursts),
        'client_cpu_max': max((s['cpu'] for s in res_series), default=None),
        'client_rss_mb_max': max((s['rss_mb'] for s in res_series), default=None),
        'client_threads_max': max((s['threads'] for s in res_series), default=None),
        'client_tcp_max': max((s['tcp'] for s in res_series if s['tcp'] is not None), default=None),
        'utc_start': utc0, 'utc_end': now()[0], 'beijing_start': bj0, 'beijing_end': now()[1],
        'burst_summaries': [{k: v for k, v in b.items() if k not in ('turns', 'e2e', 'first_text')} for b in bursts],
    }
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding='utf-8')


def health_check(n=10):
    turns = []
    for _ in range(n):
        turns.append(text_turn())
    ok = [t for t in turns if t['gateway_service_success']]
    return {'attempted': n, 'success': len(ok), 'e2e': stat([round(t['end'] - t['start'], 6) for t in ok])}


def main():
    global OUT
    ap = argparse.ArgumentParser()
    ap.add_argument('--tiers', default='55,60,80,85,200,210')
    ap.add_argument('--windows', type=int, default=2)
    ap.add_argument('--window-seconds', type=float, default=600.0)
    ap.add_argument('--min-attempts', type=int, default=100)
    ap.add_argument('--think', type=float, default=5.0)
    ap.add_argument('--out', default=str(OUT))
    ap.add_argument('--no-health', action='store_true')
    ap.add_argument('--no-cooldown', action='store_true')
    args = ap.parse_args()
    OUT = Path(args.out)
    OUT.mkdir(parents=True, exist_ok=True)
    tiers = [int(x) for x in args.tiers.split(',')]
    rec_path = OUT / 'responses-boundary-recovery.json'
    recovery = []
    if rec_path.exists():
        try:
            recovery = json.loads(rec_path.read_text(encoding='utf-8'))
        except Exception:
            recovery = []
    for U in tiers:
        for w in range(1, args.windows + 1):
            label = f'w{U}-win{w}'
            run_window(U, args.window_seconds, args.min_attempts, args.think, label)
            if not args.no_health:
                h = health_check()
                recovery.append({'after': label, **h})
                print(json.dumps({'health_after': label, **h}, ensure_ascii=False), flush=True)
                (OUT / 'responses-boundary-recovery.json').write_text(json.dumps(recovery, ensure_ascii=False, indent=2), encoding='utf-8')
            if not args.no_cooldown:
                time.sleep(30)
    print('TASK A DONE', flush=True)


if __name__ == '__main__':
    main()
