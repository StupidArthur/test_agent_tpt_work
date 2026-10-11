"""Task B: standard-Agent real-load capacity (docs/07 workload via 负载回放.json).

Baseline = 1 user, >=30 tasks. If baseline already fails the 3/5/10s lines
(Agent Task Success <99% OR task E2E p95 >10s), only observe degradation at
2/5/10 users. Layered success: gateway per-request success vs agent task success.
Raw per-request wire evidence -> results/standard-agent/wire/.
"""
from __future__ import annotations
import argparse, copy, hashlib, json, math, sys, threading, time, uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

TASK = Path(__file__).resolve().parents[1]
ROOT = Path(__file__).resolve().parents[3]
CODE = ROOT / '04-测试项/saas-llm-test/code'
sys.path.insert(0, str(CODE))
from llm_probe import protocol as P                       # noqa: E402
from llm_probe import transport as T                      # noqa: E402
from llm_probe.capacity import run_closed_loop, TurnResult, RequestAttempt  # noqa: E402

CFG = json.loads((ROOT / '04-测试项/saas-llm-test/archive/v1/llm-bench-kit/config.json').read_text(encoding='utf-8'))
TGT = next(t for t in CFG['targets'] if t['name'] == 'flash-public-low')
URL = TGT['base_url'].rstrip('/') + '/responses'
KEY = TGT['api_key']
BEIJING = timezone(timedelta(hours=8))
TIMEOUTS = {'connect': 10.0, 'idle': 60.0, 'total': 180.0}
LOADS = json.loads((ROOT / '探索性测试/2026-10-07-预设Agent容量评估/负载回放.json').read_text(encoding='utf-8'))['loads']
OUT = TASK / 'results' / 'standard-agent'
WIRE = OUT / 'wire'
LOCK = threading.Lock()
SENT = {'req': 0, 'task': 0}


def now():
    u = datetime.now(timezone.utc)
    return u.isoformat(timespec='milliseconds'), u.astimezone(BEIJING).isoformat(timespec='milliseconds')


def send(body, template_idx, marker, task_id, seq):
    raw = json.dumps(body, ensure_ascii=False).encode('utf-8')
    t0 = time.monotonic()
    with LOCK:
        SENT['req'] += 1
        rid = SENT['req']
    res = T.http_request(URL, method='POST',
                         headers={'Content-Type': 'application/json', 'Accept': 'text/event-stream', 'Authorization': 'Bearer ' + KEY},
                         body=raw, stream=True, connect_timeout=TIMEOUTS['connect'], idle_timeout=TIMEOUTS['idle'], total_timeout=TIMEOUTS['total'])
    t1 = time.monotonic()
    ns = P.normalize(res, 'responses')
    protocol_ok = res.http_status == 200 and res.error_kind is None and not ns.json_errors and ns.terminal is not None
    rec = {
        'rid': rid, 'template_idx': template_idx, 'marker': marker,
        'request_sha256': hashlib.sha256(raw).hexdigest().upper(), 'request_len': len(raw),
        'http_status': res.http_status, 'error_kind': res.error_kind, 'is_event_stream': res.is_event_stream,
        'terminal': ns.terminal, 'terminal_reason': ns.terminal_reason, 'protocol_ok': bool(protocol_ok),
        'json_errors': ns.json_errors, 'tool_calls': ns.tool_list(), 'text_len': len(ns.text or ''),
        'usage': ns.usage,
        'timings': {'t_headers': res.rel(res.t_headers), 't_first_frame': res.rel(res.t_first_frame),
                    't_first_reasoning': res.rel(ns.t_first_reasoning), 't_first_tool': res.rel(ns.t_first_tool),
                    't_first_text': res.rel(ns.t_first_text), 't_end': res.rel(res.t_end)},
        'e2e': round(t1 - t0, 6),
    }
    WIRE.mkdir(parents=True, exist_ok=True)
    (WIRE / f'{task_id:05}-{seq}-{marker}.json').write_text(json.dumps(
        rec | {'text': ns.text, 'final_text': ns.final_text,
               'frames': [{'t': res.rel(f.t), 'event': f.event, 'data': f.data, 'json_ok': f.json_ok} for f in res.frames]},
        ensure_ascii=False), encoding='utf-8')
    rec['text'] = ns.text
    rec['_wire'] = f'wire/{task_id:05}-{seq}-{marker}.json'
    return rec


def req_gateway_success(rec):
    if not rec['protocol_ok'] or rec['terminal'] != 'completed':
        return False
    return bool((rec.get('text') or '').strip()) or bool(rec.get('tool_calls'))


def task_turn(user, index):
    with LOCK:
        SENT['task'] += 1
        task_id = SENT['task']
    source = LOADS[(user + index) % len(LOADS)]
    tpl = LOADS.index(source)
    marker = 'CAP_AGENT_' + uuid.uuid4().hex
    s = json.dumps(source['body'], ensure_ascii=False).replace(source['marker'], marker)
    s = s.replace(source['cwd'].replace('\\', '\\\\'), source['cwd'].replace('\\', '\\\\') + '-' + marker)
    body = json.loads(s)
    start = time.monotonic()
    r1 = send(body, tpl, marker, task_id, 1)
    reqs = [r1]
    attempts = [RequestAttempt(r1['rid'], start, start + r1['e2e'], req_gateway_success(r1), r1['error_kind'], str(r1['http_status']))]
    checks = {'first_completed': r1['protocol_ok'] and r1['terminal'] == 'completed'}
    calls = r1['tool_calls']
    tc = calls[0] if len(calls) == 1 else None
    checks['expected_tool'] = bool(tc and tc.get('name') == 'pwsh' and tc.get('call_id'))
    args = None
    tool_args_ok = False
    if checks['expected_tool']:
        args = tc.get('final_arguments') if tc.get('final_arguments') is not None else tc.get('arguments')
        try:
            tool_args_ok = bool(json.loads(args).get('command'))
        except Exception:
            tool_args_ok = False
    checks['tool_arguments'] = tool_args_ok
    final_text = ''
    second_ok = False
    if checks['first_completed'] and checks['expected_tool'] and tool_args_ok:
        time.sleep(source['tool_delay_s'])
        second = copy.deepcopy(body)
        if r1['text']:
            second['input'].append({'type': 'message', 'role': 'assistant', 'content': [{'type': 'output_text', 'text': r1['text']}]})
        second['input'] += [{'type': 'function_call', 'call_id': tc['call_id'], 'name': tc['name'], 'arguments': args},
                            {'type': 'function_call_output', 'call_id': tc['call_id'], 'output': source['tool_result']}]
        r2 = send(second, tpl, marker, task_id, 2)
        reqs.append(r2)
        attempts.append(RequestAttempt(r2['rid'], start, start + r2['e2e'], req_gateway_success(r2), r2['error_kind'], str(r2['http_status'])))
        second_ok = r2['protocol_ok'] and r2['terminal'] == 'completed'
        final_text = r2['text'] or ''
        checks['second_completed'] = second_ok
        checks['final_numbers'] = all(x in final_text for x in (marker, 'TOTAL=21000', 'COST=14700', 'PROFIT=6300', 'MARGIN=30%'))
        checks['final_report'] = len(final_text) >= 300 and '|' in final_text and not r2['tool_calls']
    task_ok = all(checks.values())
    attr = 'unknown'
    if any(r['http_status'] and r['http_status'] >= 400 for r in reqs) or any(r['error_kind'] for r in reqs):
        attr = 'transport/http'
    elif any(r['json_errors'] for r in reqs):
        attr = 'responses_protocol'
    elif any(r['terminal'] == 'incomplete' for r in reqs):
        attr = 'incomplete'
    elif not checks['first_completed']:
        attr = 'responses_protocol'
    elif not checks['expected_tool']:
        attr = 'tool_not_called'
    elif not tool_args_ok:
        attr = 'tool_args_invalid'
    elif not second_ok:
        attr = 'tool_result_link_error'
    elif not checks.get('final_numbers', False):
        attr = 'final_business_assertion'
    elif not checks.get('final_report', True):
        attr = 'format_or_quality'
    if task_ok:
        attr = 'ok'
    ff = r1['timings']['t_first_tool']
    if ff is None:
        ff = r1['timings']['t_first_text'] or r1['timings']['t_first_reasoning']
    result = TurnResult(task_ok, start, time.monotonic(), attempts, first_text_wait=ff, scenario='standard-agent')
    result.task_id = task_id
    result.marker = marker
    result.template_idx = tpl
    result.source_session = source['session']
    result.checks = checks
    result.attribution = attr
    result.gateway_success = [req_gateway_success(r) for r in reqs]
    result.llm_requests = len(reqs)
    result.req_records = reqs
    return result


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


def summarize(turns, duration):
    n = len(turns)
    gw = [g for t in turns for g in t.gateway_success]
    e2e = [round(t.end - t.start, 6) for t in turns]
    ff = [t.first_text_wait for t in turns]
    attr = {}
    for t in turns:
        if not t.ok:
            attr[t.attribution] = attr.get(t.attribution, 0) + 1
    return {
        'tasks': n, 'task_success': sum(t.ok for t in turns),
        'task_success_rate': round(sum(t.ok for t in turns) / n * 100, 3) if n else None,
        'llm_requests': len(gw), 'gateway_requests_success': sum(gw),
        'gateway_success_rate': round(sum(gw) / len(gw) * 100, 3) if gw else None,
        'task_e2e': stat(e2e), 'first_feedback': stat(ff),
        'tool_call_success': round(sum(t.checks.get('expected_tool', False) for t in turns) / n * 100, 3) if n else None,
        'attribution': attr, 'requests_per_s': round(len(gw) / duration, 4) if duration else None,
        'turns_per_s': round(n / duration, 4) if duration else None,
        'llm_requests_per_task': round(len(gw) / n, 4) if n else None,
    }


def strip_turn(t):
    return {'task_id': t.task_id, 'task_ok': t.ok, 'checks': t.checks, 'attribution': t.attribution,
            'first_feedback_s': t.first_text_wait, 'marker': t.marker, 'template_idx': t.template_idx,
            'source_session': t.source_session, 'llm_requests': t.llm_requests, 'gateway_success': t.gateway_success,
            'e2e_s': round(t.end - t.start, 6),
            'requests': [{k: v for k, v in r.items() if k != 'text'} for r in t.req_records]}


def run_stage(users, min_tasks, max_seconds, think=5.0):
    label = f'u{users}'
    path = OUT / f'{label}.json'
    if path.exists():
        print(f'skip {label}', flush=True)
        return json.loads(path.read_text(encoding='utf-8'))
    utc0, bj0 = now()
    r = run_closed_loop(lambda u, i: task_turn(u, i), users=users, think_time=think,
                        min_seconds=0, min_turns=min_tasks, max_seconds=max_seconds)
    raw = r.turns
    obj = {
        'label': label, 'users': users, 'think_time_s': think, 'min_tasks': min_tasks,
        'duration_s': round(r.duration_s, 3), 'stop_reason': r.stopped_by, 'attempted_tasks': len(raw),
        'peak_in_flight': r.peak_in_flight, 'utc_start': utc0, 'utc_end': now()[0],
        'beijing_start': bj0, 'beijing_end': now()[1],
        'summary': summarize(raw, r.duration_s), 'turns': [strip_turn(t) for t in raw],
    }
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'label': label, 'tasks': obj['attempted_tasks'], 'summary': obj['summary']}, ensure_ascii=False), flush=True)
    return obj


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mode', choices=['baseline', 'degrade'], required=True)
    ap.add_argument('--users', default='2,5,10')
    ap.add_argument('--min-tasks', type=int, default=30)
    ap.add_argument('--max-seconds', type=float, default=2400.0)
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if args.mode == 'baseline':
        run_stage(1, args.min_tasks, args.max_seconds)
    else:
        for u in [int(x) for x in args.users.split(',')]:
            run_stage(u, args.min_tasks, args.max_seconds)
    print('TASK B DONE', flush=True)


if __name__ == '__main__':
    main()
