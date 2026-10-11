"""todo_2 容量-延迟曲线执行器（Responses API, flash, effort=low, 单 key）。

复用测试项公共执行器 llm_probe 的 protocol/transport；本文件只做 burst 调度、
断言、证据落盘与指标。两种 workload：
  text  : 单次 Responses 请求，正文严格等于随机 marker（测试 A）
  tool  : 一个 Agent turn = 请求1(function_call) + 本地 add_numbers + 请求2(42)（测试 B）

每个 wave：barrier 同步发起 N 个独立 turn，排空后再下一 wave。失败不重试。
"""
from __future__ import annotations
import argparse, json, math, os, statistics, sys, threading, time, uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import psutil

TASK = Path(__file__).resolve().parents[1]
ROOT = Path(__file__).resolve().parents[5]
CODE = ROOT / '04-测试项/saas-llm-test/code'
sys.path.insert(0, str(CODE))
from llm_probe import protocol as P        # noqa: E402
from llm_probe import transport as T       # noqa: E402

CFG = json.loads((ROOT / '04-测试项/saas-llm-test/archive/v1/llm-bench-kit/config.json').read_text(encoding='utf-8'))
TARGET = next(t for t in CFG['targets'] if t['name'] == 'flash-public-low')
BASE = TARGET['base_url'].rstrip('/')
URL = BASE + '/responses'
KEY = TARGET['api_key']
BEIJING = timezone(timedelta(hours=8))
TIMEOUTS = {'connect': 15.0, 'idle': 60.0, 'total': 180.0}
MODEL = 'flash'
EFFORT = 'low'
MAX_OUT = 256

DEFAULT_TEXT_TIERS = [1, 5, 10, 20, 50, 100, 200, 300, 500, 800, 1000]
DEFAULT_TOOL_TIERS = [1, 5, 10, 20, 50, 100, 200]


def now_pair():
    u = datetime.now(timezone.utc)
    return u.isoformat(timespec='milliseconds'), u.astimezone(BEIJING).isoformat(timespec='milliseconds')


def headers(stream=True):
    return {'Content-Type': 'application/json', 'Accept': 'text/event-stream' if stream else 'application/json',
            'Authorization': 'Bearer ' + KEY}


def send(body, turn_t0):
    """一次 Responses 请求；返回 (record, ns, res)。"""
    raw = json.dumps(body, ensure_ascii=False).encode('utf-8')
    t0 = time.monotonic()
    res = T.http_request(URL, method='POST', headers=headers(True), body=raw, stream=True,
                         connect_timeout=TIMEOUTS['connect'], idle_timeout=TIMEOUTS['idle'],
                         total_timeout=TIMEOUTS['total'])
    t1 = time.monotonic()
    ns = P.normalize(res, 'responses')
    rec = {
        'request': body,
        'http_status': res.http_status, 'error_kind': res.error_kind, 'error': res.error,
        'is_event_stream': res.is_event_stream,
        't_send_wall': round(t0 - turn_t0, 6),
        'timings': {'t_headers': res.rel(res.t_headers), 't_first_frame': res.rel(res.t_first_frame),
                    't_first_text': res.rel(ns.t_first_text), 't_end': res.rel(res.t_end)},
        'e2e': round(t1 - t0, 6),
        'terminal': ns.terminal, 'terminal_reason': ns.terminal_reason,
        'text': ns.text, 'final_text': ns.final_text, 'usage': ns.usage,
        'json_errors': ns.json_errors, 'tool_calls': ns.tool_list(),
        'frames': [{'t': res.rel(f.t), 'event': f.event, 'data': f.data, 'json_ok': f.json_ok} for f in res.frames],
    }
    return rec, ns, res


def text_turn():
    marker = 'CAP_' + uuid.uuid4().hex[:12]
    tstart = time.monotonic()
    body = P.responses_body(MODEL, text=f'只输出 {marker}', stream=True,
                            max_output_tokens=MAX_OUT, reasoning_effort=EFFORT)
    rec, ns, res = send(body, tstart)
    checks = {
        'http_200': res.http_status == 200,
        'completed': ns.terminal == 'completed',
        'no_json_error': not ns.json_errors,
        'exact_marker': (ns.text or '').strip() == marker,
    }
    return {'workload': 'text', 'marker': marker, 'start': tstart, 'end': time.monotonic(),
            'checks': checks, 'ok': all(checks.values()), 'requests': [rec],
            'first_text_turn_rel': None if ns.t_first_text is None else round(res.rel(ns.t_first_text) + (0), 6),
            'error_kind': res.error_kind, 'status': res.http_status, 'terminal': ns.terminal}


def tool_turn():
    tstart = time.monotonic()
    body1 = P.responses_body(MODEL, text='调用 add_numbers，参数 a=17 b=25。', stream=True,
                             max_output_tokens=MAX_OUT, tools=[P.add_numbers_tool()],
                             tool_choice='required', reasoning_effort=EFFORT)
    rec1, ns1, res1 = send(body1, tstart)
    calls = list(ns1.tool_calls.values())
    tc = calls[0] if len(calls) == 1 else None
    try:
        args = json.loads(tc.final_arguments if (tc and tc.final_arguments is not None) else (tc.arguments if tc else 'null'))
    except Exception:
        args = None
    valid = bool(tc and tc.name == 'add_numbers' and tc.call_id and args == {'a': 17, 'b': 25})
    checks = {'first_completed': (res1.http_status == 200 and ns1.terminal == 'completed' and not ns1.json_errors),
              'tool_identity_arguments': valid}
    reqs = [rec1]
    first_rel = None
    if checks['first_completed'] and valid:
        total = args['a'] + args['b']
        history = body1['input'] + [
            {'type': 'function_call', 'name': tc.name, 'call_id': tc.call_id, 'arguments': json.dumps(args)},
            {'type': 'function_call_output', 'call_id': tc.call_id, 'output': str(total)}]
        body2 = P.responses_body(MODEL, input_items=history, stream=True, tools=[P.add_numbers_tool()],
                                 instructions='正文仅输出计算结果整数。', max_output_tokens=MAX_OUT,
                                 reasoning_effort=EFFORT)
        rec2, ns2, res2 = send(body2, tstart)
        reqs.append(rec2)
        checks['second_completed'] = (res2.http_status == 200 and ns2.terminal == 'completed' and not ns2.json_errors)
        checks['final_answer'] = (ns2.text or '').strip() == str(total)
        checks['no_unresolved_tool'] = not ns2.tool_calls
        first_rel = None if ns2.t_first_text is None else round(res2.rel(ns2.t_first_text), 6)
    last = reqs[-1]
    return {'workload': 'tool', 'start': tstart, 'end': time.monotonic(), 'checks': checks,
            'ok': all(checks.values()), 'requests': reqs, 'first_text_turn_rel': first_rel,
            'error_kind': last['error_kind'], 'status': last['http_status'], 'terminal': last['terminal']}


TURN_FN = {'text': text_turn, 'tool': tool_turn}


def classify(turn, workload):
    """把一次失败归类，用于 429/5xx/timeout/connection/incomplete/content_mismatch 计数。"""
    cats = []
    reqs = turn.get('requests', [])
    any_timeout = any(r['error_kind'] in ('read_idle_timeout', 'total_timeout') for r in reqs)
    any_conn = any(r['error_kind'] in ('connect', 'dns', 'tls', 'http', 'other') for r in reqs)
    for r in reqs:
        if r['http_status'] == 429:
            cats.append('http_429')
        if r['http_status'] and r['http_status'] >= 500:
            cats.append('http_5xx')
    if any_timeout:
        cats.append('timeout')
    if any_conn:
        cats.append('connection_error')
    if any(r['terminal'] in ('incomplete', 'failed') for r in reqs):
        cats.append('incomplete')
    c = turn['checks']
    if c.get('exact_marker') is False or (workload == 'tool' and not (c.get('final_answer', True) and c.get('no_unresolved_tool', True))):
        cats.append('content_mismatch')
    return sorted(set(cats))


def run_wave(planned, workload, label, out_dir):
    turns = [None] * planned
    lock = threading.Lock()
    inflight = {'n': 0, 'peak': 0}
    starts = []
    barrier = threading.Barrier(planned)
    res_samples = []
    stop_sample = threading.Event()

    proc = psutil.Process()

    def sampler():
        proc.cpu_percent(None)
        while not stop_sample.is_set():
            res_samples.append({'t': round(time.monotonic(), 3), 'cpu': proc.cpu_percent(None),
                                'rss_mb': round(proc.memory_info().rss / 1e6, 2), 'threads': proc.num_threads()})
            stop_sample.wait(1)

    def worker(i):
        try:
            barrier.wait(timeout=30)
        except threading.BrokenBarrierError:
            turns[i] = {'workload': workload, 'start': time.monotonic(), 'end': time.monotonic(),
                        'ok': False, 'checks': {'barrier_broken': False}, 'requests': [],
                        'error_kind': 'barrier', 'status': None, 'terminal': None,
                        'cats': ['barrier'], 'error': 'barrier_broken'}
            return
        with lock:
            inflight['n'] += 1
            inflight['peak'] = max(inflight['peak'], inflight['n'])
        starts.append(time.monotonic())
        try:
            turn = TURN_FN[workload]()
        except Exception as exc:  # noqa: BLE001
            turn = {'workload': workload, 'start': time.monotonic(), 'end': time.monotonic(), 'ok': False,
                    'checks': {}, 'requests': [], 'error_kind': 'exception', 'status': None,
                    'terminal': None, 'error': f'{type(exc).__name__}: {exc}', 'first_text_turn_rel': None}
        finally:
            with lock:
                inflight['n'] -= 1
        turn['cats'] = [] if turn['ok'] else classify(turn, workload)
        turns[i] = turn

    st = threading.Thread(target=sampler, daemon=True)
    st.start()
    utc0, bj0 = now_pair()
    t_wall0 = time.monotonic()
    threads = [threading.Thread(target=worker, args=(i,), daemon=True) for i in range(planned)]
    for th in threads:
        th.start()
    for th in threads:
        th.join()
    wall = time.monotonic() - t_wall0
    stop_sample.set()
    st.join(timeout=3)

    utc0, bj0 = now_pair()
    utc1, bj1 = now_pair()
    ok_turns = [t for t in turns if t['ok']]
    e2e = [round(t['end'] - t['start'], 6) for t in ok_turns]
    first = [t['first_text_turn_rel'] for t in ok_turns if t.get('first_text_turn_rel') is not None]
    cats = {}
    for t in turns:
        for c in t.get('cats', []):
            cats[c] = cats.get(c, 0) + 1
    rec = {
        'label': label, 'workload': workload, 'planned_concurrency': planned,
        'actual_peak_in_flight': inflight['peak'],
        'launch_spread_s': round((max(starts) - min(starts)) if starts else 0.0, 6),
        'attempted_turns': planned, 'successful': len(ok_turns), 'failed': planned - len(ok_turns),
        'success_rate': round(len(ok_turns) / planned * 100, 3),
        'e2e': stat(e2e), 'first_text': stat(first),
        'categories': cats,
        'wall_clock_s': round(wall, 3),
        'requests': sum(len(t.get('requests', [])) for t in turns),
        'client_cpu_max': max((s['cpu'] for s in res_samples), default=None),
        'client_mem_mb_max': max((s['rss_mb'] for s in res_samples), default=None),
        'client_threads_max': max((s['threads'] for s in res_samples), default=None),
        'utc_start': utc0, 'utc_end': utc1, 'beijing_start': bj0, 'beijing_end': bj1,
        'turns': turns,
    }
    (out_dir / f'{label}.json').write_text(json.dumps(rec, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in rec.items() if k != 'turns'}, ensure_ascii=False), flush=True)
    return rec


def pct(vals, q):
    if not vals:
        return None
    s = sorted(vals)
    return round(s[max(0, math.ceil(q / 100.0 * len(s)) - 1)], 6)


def stat(vals):
    if not vals:
        return None
    return {'n': len(vals), 'mean': round(sum(vals) / len(vals), 6), 'p50': pct(vals, 50),
            'p95': pct(vals, 95), 'max': round(max(vals), 6)}


def waves_for(n):
    return max(3, math.ceil(30 / n))


def run_tier(n, workload, waves, wave_gap, tier_gap, out_dir, tag=''):
    tier_recs = []
    for k in range(1, waves + 1):
        rec = run_wave(n, workload, f'w{n}-{k}{tag}', out_dir)
        tier_recs.append(rec)
        time.sleep(wave_gap)
    ok = [t for r in tier_recs for t in r['turns'] if t['ok']]
    e2e = [round(t['end'] - t['start'], 6) for t in ok]
    first = [t['first_text_turn_rel'] for t in ok if t.get('first_text_turn_rel') is not None]
    attempted = sum(r['attempted_turns'] for r in tier_recs)
    cats = {}
    for r in tier_recs:
        for c, v in r['categories'].items():
            cats[c] = cats.get(c, 0) + v
    summary = {
        'planned_concurrency': n, 'workload': workload, 'waves': waves,
        'attempted': attempted, 'successful': len(ok), 'failed': attempted - len(ok),
        'success_rate': round(len(ok) / attempted * 100, 3) if attempted else None,
        'e2e': stat(e2e), 'first_text': stat(first), 'categories': cats,
        'peak_in_flight_max': max(r['actual_peak_in_flight'] for r in tier_recs),
        'min_peak_ratio': round(min(r['actual_peak_in_flight'] / r['planned_concurrency'] for r in tier_recs), 4),
        'max_peak_ratio': round(max(r['actual_peak_in_flight'] / r['planned_concurrency'] for r in tier_recs), 4),
        'wall_clock_s': round(sum(r['wall_clock_s'] for r in tier_recs), 3),
        'client_cpu_max': max((r['client_cpu_max'] for r in tier_recs if r['client_cpu_max'] is not None), default=None),
        'client_mem_mb_max': max((r['client_mem_mb_max'] for r in tier_recs if r['client_mem_mb_max'] is not None), default=None),
        'client_threads_max': max((r['client_threads_max'] for r in tier_recs if r['client_threads_max'] is not None), default=None),
    }
    time.sleep(tier_gap)
    return summary


def read_json(p, default=None):
    if p.exists():
        return json.loads(p.read_text(encoding='utf-8'))
    return default


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--test', choices=['a', 'b', 'all'], required=True)
    ap.add_argument('--tiers', default='')
    ap.add_argument('--waves', type=int, default=0, help='override waves per tier')
    ap.add_argument('--wave-gap', type=float, default=2.0)
    ap.add_argument('--tier-gap', type=float, default=10.0)
    ap.add_argument('--max-tier', type=int, default=0, help='stop ladder after this tier value')
    ap.add_argument('--tag', default='', help='suffix appended to wave labels (re-checks must not overwrite)')
    args = ap.parse_args()

    (TASK / 'results' / 'simple-text').mkdir(parents=True, exist_ok=True)
    (TASK / 'results' / 'agent-tool').mkdir(parents=True, exist_ok=True)
    (TASK / 'evidence').mkdir(parents=True, exist_ok=True)

    cfg_snapshot = {
        'utc': now_pair()[0], 'url': URL, 'protocol': 'responses', 'model': MODEL,
        'reasoning_effort': EFFORT, 'max_output_tokens': MAX_OUT, 'stream': True,
        'credential_mode': 'single key', 'credential_reference': 'flash-public-low',
        'timeouts': TIMEOUTS, 'text_tiers': DEFAULT_TEXT_TIERS, 'tool_tiers': DEFAULT_TOOL_TIERS,
        'waves_rule': 'max(3, ceil(30/concurrency))', 'wave_gap_s': args.wave_gap, 'tier_gap_s': args.tier_gap,
        'test': args.test, 'tiers_override': args.tiers, 'waves_override': args.waves,
    }
    (TASK / '运行配置.json').write_text(json.dumps(cfg_snapshot, ensure_ascii=False, indent=2), encoding='utf-8')

    tiers_override = [int(x) for x in args.tiers.split(',') if x.strip()] if args.tiers else None

    all_summaries = {}

    def ladder(workload, default_tiers, subdir):
        tiers = tiers_override or default_tiers
        summaries = []
        prev_fail_p95 = 0
        for n in tiers:
            if args.max_tier and n > args.max_tier:
                break
            waves = args.waves or waves_for(n)
            s = run_tier(n, workload, waves, args.wave_gap, args.tier_gap, TASK / 'results' / subdir, args.tag)
            summaries.append(s)
            # safety stops
            over10 = (s['e2e'] and s['e2e']['p95'] is not None and s['e2e']['p95'] > 10.0)
            prev_fail_p95 = prev_fail_p95 + 1 if over10 else 0
            if prev_fail_p95 >= 2:
                print(f'STOP: two consecutive tiers E2E p95>10s at n={n}', flush=True)
                break
            if s['success_rate'] is not None and s['success_rate'] < 95:
                print(f'STOP: success_rate<95% at n={n}', flush=True)
                break
            err = s['categories'].get('http_429', 0) + s['categories'].get('http_5xx', 0) + s['categories'].get('timeout', 0)
            if attempted_ratio(err, s['attempted']) > 5:
                print(f'STOP: 429+5xx+timeout>5% at n={n}', flush=True)
                break
            if s['max_peak_ratio'] < 0.9:
                print(f'STOP: client never reached planned concurrency at n={n} (max peak ratio {s["max_peak_ratio"]})', flush=True)
                break
            if n >= 1000:
                print('STOP: reached 1000 concurrent', flush=True)
                break
        return summaries

    if args.test in ('a', 'all'):
        print('==== TEST A: simple text ====', flush=True)
        all_summaries['simple-text'] = ladder('text', DEFAULT_TEXT_TIERS, 'simple-text')
    if args.test in ('b', 'all'):
        print('==== TEST B: agent tool ====', flush=True)
        all_summaries['agent-tool'] = ladder('tool', DEFAULT_TOOL_TIERS, 'agent-tool')

    (TASK / '结果汇总.json').write_text(json.dumps({'config': cfg_snapshot, 'tiers': all_summaries},
                                                   ensure_ascii=False, indent=2), encoding='utf-8')
    print('DONE', flush=True)


def attempted_ratio(err, attempted):
    return err / attempted * 100 if attempted else 0.0


if __name__ == '__main__':
    main()
