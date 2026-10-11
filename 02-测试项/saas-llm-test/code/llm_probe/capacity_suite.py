"""Capacity plan preview/execution; no requests without --execute and confirmed plan.

Fixed history, real two-request tool turns, shared hard request admission budget,
joined workers, indexed wire evidence, independent windows and recovery baseline.
"""
from __future__ import annotations

import concurrent.futures
import dataclasses
import json
import math
import threading
import time
import uuid
import hashlib
from pathlib import Path

from . import protocol as P
from . import runner as R
from .capacity import RequestAttempt, TurnResult
from .stats import LevelResult, capacity_conclusion, evaluate_level, summarise
from .window_evidence import WindowAttempt, PressureSampler, capacity_lines, failure_category, fingerprint, window_status


class Budget:
    def __init__(self, limit):
        self.limit, self.reserved, self.sent = limit, 0, 0
        self.lock = threading.Lock()

    def reserve(self, n):
        with self.lock:
            if self.reserved + n > self.limit:
                return False
            self.reserved += n
            return True

    def request_id(self):
        with self.lock:
            self.sent += 1
            return self.sent


def validate(plan, execute=False):
    if plan.get('load_isolation', 'unknown') not in ('declared_exclusive', 'observed_shared', 'unknown'):
        raise ValueError('load_isolation must describe actual shared gateway/key traffic')
    if plan.get('workload') not in ('text', 'tool'):
        raise ValueError('workload must be text or tool')
    for k in ('max_requests', 'max_users', 'output_tokens', 'tool_output_tokens', 'baseline_turns'):
        if not isinstance(plan.get(k), int) or isinstance(plan[k], bool) or plan[k] <= 0:
            raise ValueError(f'{k} must be a positive integer')
    for k in ('think_time', 'recovery_tolerance'):
        if not isinstance(plan.get(k), (float, int)) or not math.isfinite(plan[k]) or plan[k] < 0:
            raise ValueError(f'{k} must be finite and nonnegative')
    if plan['baseline_turns'] < 10:
        raise ValueError('baseline_turns >= 10')
    if not plan.get('model') or plan.get('effort') not in ('off', 'low', 'medium', 'high'):
        raise ValueError('model and explicit effort required')
    if not plan.get('stages'):
        raise ValueError('stages required')
    for k in ('connect_timeout', 'idle_timeout', 'total_timeout'):
        v = plan.get(k, 10 if k == 'connect_timeout' else 60 if k == 'idle_timeout' else 180)
        if not isinstance(v, (int, float)) or not math.isfinite(v) or v <= 0:
            raise ValueError(f'{k} must be positive and finite')
    for s in plan['stages']:
        if s.get('item') not in ('CAP-02', 'CAP-03', 'CAP-04', 'CAP-06'):
            raise ValueError('supported items: CAP-02/03/04/06')
        if s['item'] == 'CAP-02' and plan['workload'] != 'text':
            raise ValueError('CAP-02 requires text')
        if s['item'] == 'CAP-03' and plan['workload'] != 'tool':
            raise ValueError('CAP-03 requires tool')
        if not isinstance(s.get('users'), list) or not s['users']:
            raise ValueError('users must be a nonempty list')
        if any(type(n) is not int or not 1 <= n <= plan['max_users'] for n in s['users']):
            raise ValueError('user levels exceed confirmed ceiling')
        for k in ('min_seconds', 'max_seconds'):
            if not isinstance(s.get(k), (int, float)) or not math.isfinite(s[k]) or s[k] <= 0:
                raise ValueError(f'{k} must be positive and finite')
        if type(s.get('min_turns')) is not int or s['min_turns'] <= 0:
            raise ValueError('min_turns must be a positive integer')
        if s['max_seconds'] < s['min_seconds']:
            raise ValueError('max_seconds < min_seconds')
        if type(s.get('windows', 1)) is not int or s.get('windows', 1) < 1:
            raise ValueError('windows must be positive integer')
        if s['item'] == 'CAP-04':
            if s.get('windows', 1) < 2 or s['min_seconds'] < 600 or s['min_turns'] < 100:
                raise ValueError('CAP-04 needs >=2 windows, each >=600s and >=100 turns')
        elif s['min_seconds'] < 120 or s['min_turns'] < 30:
            raise ValueError('boundary/stress windows need >=120s and >=30 turns')
    slo = plan.get('slo', {})
    if execute:
        if any(s['item'] == 'CAP-04' for s in plan['stages']) and not plan.get('credential_id'):
            raise ValueError('CAP-04 requires a non-secret credential_id for shared-load attribution')
        if plan.get('confirmed') is not True or not plan.get('approval_reference'):
            raise ValueError('plan is not confirmed; supply actual approval reference')
        if slo.get('confirmed') is not True:
            raise ValueError('confirmed SLO required')
        for k in ('success_rate', 'turn_p95_s', 'first_text_p95_s'):
            if not isinstance(slo.get(k), (int, float)) or not math.isfinite(slo[k]) or slo[k] <= 0:
                raise ValueError(f'confirmed SLO {k} required')
        if slo['success_rate'] > 1:
            raise ValueError('success_rate <= 1')


def preview(plan):
    validate(plan)
    requests_per_turn = 2 if plan['workload'] == 'tool' else 1
    # Zero-latency conservative bounds for fixed think time; not minimum samples.
    bound = 0 if plan['think_time'] > 0 else None
    seconds = 0
    for s in plan['stages']:
        for n in s['users']:
            w = s.get('windows', 1)
            seconds += s['max_seconds'] * w
            if bound is not None:
                bound += n * (math.ceil(s['max_seconds'] / plan['think_time']) + 1) * w
        if s['item'] == 'CAP-06' and bound is not None:
            bound += 2 * plan['baseline_turns']
    return {'mode': 'preview_no_requests', 'requests_per_turn': requests_per_turn,
            'time_bound_excluding_drain_s': seconds,
            'zero_latency_request_bound': None if bound is None else bound * requests_per_turn,
            'hard_admission_request_limit': plan['max_requests'],
            'note': 'minimum turns are not request limits; budget exhaustion means insufficient measurement'}


def make_turn(target, store, plan, budget, instance, label):
    model, effort = plan['model'], None if plan['effort'] == 'off' else plan['effort']
    timeout = R.target_opts(plan)

    def turn(user, index):
        tool = plan['workload'] == 'tool'
        if not budget.reserve(2 if tool else 1):
            return None  # not attempted; never fabricate a failed HTTP request
        start, reqs, refs = time.monotonic(), [], []
        marker = 'CAP_' + uuid.uuid4().hex

        def send(body):
            rid, t0 = budget.request_id(), time.monotonic()
            store.write_json(f'capacity-suite/{instance}/{label}/{rid}-{marker}-started.json',
                             {'request': body, 'user': user, 'turn_index': index, 'started_monotonic': t0},
                             instances=[instance], kind='capacity_request_started')
            res = R.http_request(target.responses_url(), method='POST', headers=target.headers(stream=True),
                                 body=json.dumps(body).encode(), stream=True,
                                 connect_timeout=timeout['connect'], idle_timeout=timeout['idle'],
                                 total_timeout=timeout['total'])
            ns = P.normalize(res, 'responses')
            ok = (res.http_status == 200 and res.error_kind is None and ns.terminal == 'completed'
                  and not ns.json_errors and bool(ns.text.strip() or ns.tool_calls))
            reqs.append(RequestAttempt(rid, t0, time.monotonic(), ok, res.error_kind, str(res.http_status)))
            rec = store.write_json(f'capacity-suite/{instance}/{label}/{rid}-{marker}.json',
                                   {'request': body, 'response': R._attempt_record(res, ns),
                                    'gateway_service_success': ok,
                                    'primary_failure': failure_category({'gateway_service_success': ok,
                                        'http_status': res.http_status, 'error_kind': res.error_kind,
                                        'terminal': ns.terminal, 'empty_text': not bool(ns.text.strip() or ns.tool_calls)}),
                                    'body_text': getattr(res, 'body_text', ''),
                                    'frames': [{'t': f.t, 'event': f.event, 'data': f.data, 'raw': f.raw,
                                                'json_ok': f.json_ok} for f in getattr(res, 'frames', [])],
                                    'normalized': ns.to_dict() if hasattr(ns, 'to_dict') else {'terminal': ns.terminal},
                                    'user': user, 'turn_index': index}, instances=[instance], kind='capacity_wire')
            refs.append(rec['rel_path'])
            return ns, ok

        prompt = '调用 add_numbers，参数 a=17 b=25。' if tool else f'只输出 {marker}'
        body = P.responses_body(model, text=prompt, stream=True, reasoning_effort=effort,
                                max_output_tokens=plan['output_tokens'],
                                tools=[P.add_numbers_tool()] if tool else None,
                                tool_choice='required' if tool else None)
        ns, ok = send(body)
        first = ns.t_first_text
        checks = {'first_completed': ok}
        if tool:
            calls = list(ns.tool_calls.values())
            tc = calls[0] if len(calls) == 1 else None
            try:
                args = json.loads(tc.final_arguments if tc.final_arguments is not None else tc.arguments) if tc else None
            except (ValueError, TypeError):
                args = None
            valid = bool(tc and tc.name == 'add_numbers' and tc.call_id and args == {'a': 17, 'b': 25}
                         and (tc.final_arguments is None or tc.arguments == tc.final_arguments))
            checks['tool_identity_arguments'] = valid
            if ok and valid:
                total = args['a'] + args['b']  # independent local tool execution
                history = body['input'] + [
                    {'type': 'function_call', 'name': tc.name, 'call_id': tc.call_id,
                     'arguments': json.dumps(args)},
                    {'type': 'function_call_output', 'call_id': tc.call_id, 'output': str(total)}]
                ns, second_ok = send(P.responses_body(model, input_items=history, stream=True,
                    tools=[P.add_numbers_tool()], reasoning_effort=effort,
                    instructions='正文仅输出计算结果整数。', max_output_tokens=plan['tool_output_tokens']))
                first = ns.t_first_text  # final-answer first text relative to entire turn
                checks['second_completed'] = second_ok
                checks['final_answer'] = ns.text.strip() == str(total)
                checks['no_unresolved_tool'] = not ns.tool_calls
        else:
            checks['exact_marker'] = ns.text.strip() == marker
        # Text capacity measures gateway service, not exact model wording.
        result = TurnResult(all(checks.values()) if tool else ok, start, time.monotonic(), reqs,
                            None if first is None else first - start, scenario=plan['workload'])
        result.checks, result.evidence = checks, refs
        return result
    return turn


def window(turn, users, think_time, min_seconds, min_turns, max_seconds, clock=time.monotonic):
    started, stop, lock, turns = clock(), threading.Event(), threading.Lock(), []
    reason = ['']

    def worker(u):
        i = 0
        while not stop.is_set() and clock() - started < max_seconds:
            try:
                t = turn(u, i)
            except BaseException:
                stop.set()
                raise
            if t is None:
                reason[0] = 'request_budget'
                stop.set()
                break
            with lock:
                turns.append(t)
                elapsed = clock() - started
                if elapsed >= max_seconds:
                    if not reason[0]:
                        reason[0] = 'max_seconds'
                    stop.set()
                elif elapsed >= min_seconds and len(turns) >= min_turns:
                    if not reason[0]:
                        reason[0] = 'sample_met'
                    stop.set()
            i += 1
            stop.wait(think_time)
    with concurrent.futures.ThreadPoolExecutor(max_workers=users) as pool:
        futures = [pool.submit(worker, u) for u in range(users)]
        try:
            for f in futures:
                f.result()
        finally:
            stop.set()
    # Executor joins all requests before returning; drain included separately.
    elapsed = clock() - started
    return turns, {'elapsed_s': elapsed, 'stopped_by': reason[0] or 'max_seconds',
                   'enough_sample': len(turns) >= min_turns and elapsed >= min_seconds
                                    and reason[0] == 'sample_met', 'drained': True}


def level(users, turns, state, slo):
    requests = [r for t in turns for r in t.requests]
    succeeded = [t for t in turns if t.ok]
    lv = LevelResult(users=users, turns_attempted=len(turns), turns_succeeded=len(succeeded),
        requests_attempted=len(requests), requests_succeeded=sum(r.ok for r in requests),
        duration_s=state['elapsed_s'], enough_sample=state['enough_sample'],
        turn_p95_s=summarise([t.end-t.start for t in turns]).p95,
        first_text_p95_s=summarise([t.first_text_wait for t in succeeded]).p95)
    # Peak is measured from actual overlapping HTTP attempts, not configured users.
    events = sorted([(r.start, 1) for r in requests] + [(r.end, -1) for r in requests])
    current = 0
    for _, delta in events:
        current += delta
        lv.peak_in_flight = max(lv.peak_in_flight, current)
    if succeeded and any(t.first_text_wait is None for t in succeeded):
        lv.enough_sample = False
        lv.notes.append('missing first-text timing')
    return evaluate_level(lv, slo)


def execute(target, store, plan):
    validate(plan, execute=True)
    if not target.key:
        raise ValueError('credential missing')
    run_id, budget = uuid.uuid4().hex, Budget(plan['max_requests'])
    slo = R.slo_from_opts(plan)
    results = []
    for stage_index, stage in enumerate(plan['stages']):
        item = stage['item']
        instance = f'{item}/{target.name}/{run_id}-{stage_index}'
        result = R.InstanceResult(instance, item)
        initial = budget.sent
        turn = make_turn(target, store, plan, budget, instance, 'wire')

        def health(label):
            got = []
            for i in range(plan['baseline_turns']):
                t = turn(0, i)
                if t is None:
                    break
                got.append(t)
            return {'label': label, 'attempted': len(got), 'successes': sum(t.ok for t in got),
                    'p95': summarise([t.end-t.start for t in got if t.ok]).p95,
                    'turns': [dataclasses.asdict(t) | {'checks': t.checks, 'evidence': t.evidence} for t in got]}

        baseline = health('baseline') if item == 'CAP-06' else None
        rows, details = [], []
        original_limit = budget.limit
        if item == 'CAP-06':
            # Reserve enough admission capacity to observe recovery after stress.
            budget.limit -= plan['baseline_turns'] * (2 if plan['workload'] == 'tool' else 1)
        for users in stage['users']:
            for w in range(stage.get('windows', 1)):
                config = {'plan': plan, 'target': target.name, 'endpoint': target.responses_url(),
                          'credential_id': plan.get('credential_id', 'unrecorded'),
                          'users': users, 'window': w, 'min_seconds': stage['min_seconds'],
                          'min_attempts': stage['min_turns'],
                          'executor_sha256': fingerprint({p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                              for p in Path(__file__).parent.glob('*.py')})}
                attempt = WindowAttempt(store, f'{instance}/u{users}/w{w}', config)
                resource_path = Path(store.root) / store.prefix / attempt.prefix / 'resources.jsonl'
                window_started = time.monotonic()
                try:
                    with PressureSampler(resource_path) as sampler:
                        turns, state = window(turn, users, plan['think_time'], stage['min_seconds'],
                                              stage['min_turns'], stage['max_seconds'])
                except BaseException as exc:
                    resource_record = store.index_existing(resource_path.relative_to(Path(store.root) / store.prefix).as_posix(),
                        instances=[instance], kind='interrupted_pressure_resources') if resource_path.exists() else None
                    attempt.finish({'complete': False, 'drained': False, 'error': str(exc),
                                    'error_type': type(exc).__name__, 'resource_evidence': resource_record,
                                    'elapsed_s': time.monotonic()-window_started, 'attempted': None})
                    raise
                lv = level(users, turns, state, slo)
                resources = sampler.summary()
                resource_record = store.index_existing(resource_path.relative_to(Path(store.root) / store.prefix).as_posix(),
                    instances=[instance], kind='pressure_resources')
                normalized = {'users': users, 'complete': state['enough_sample'],
                    'drained': state.get('drained', False), 'elapsed_s': state['elapsed_s'],
                    'attempted': len(turns), 'min_seconds': stage['min_seconds'], 'min_attempts': stage['min_turns'],
                    'success_rate': lv.success_rate, 'e2e_p95': lv.turn_p95_s,
                    'client_limited': (lv.client_bottleneck if plan.get('client_validation', {}).get('confirmed') is True
                                       and plan.get('client_validation', {}).get('basis') else None),
                    'resources_complete': resources['complete'],
                    'load_isolation': plan.get('load_isolation', 'unknown')}
                finished = attempt.finish({'complete': state['enough_sample'], 'drained': state.get('drained', False),
                    'elapsed_s': state['elapsed_s'], 'attempted': len(turns), 'state': state,
                    'metrics': lv.to_dict(), 'resources': resources, 'capacity_window': normalized})
                rows.append(lv)
                details.append({'users': users, 'window': w, 'state': state, 'metrics': lv.to_dict(),
                    'attempt_finish': finished, 'resources': resources, 'resource_evidence': resource_record,
                    'capacity_window': normalized,
                    'turns': [dataclasses.asdict(t) | {'checks': t.checks, 'evidence': t.evidence} for t in turns]})
                if state['stopped_by'] == 'request_budget':
                    break
            if budget.reserved >= budget.limit:
                break
        budget.limit = original_limit
        recovery = health('recovery') if item == 'CAP-06' else None
        result.metrics.update({'windows': details, 'baseline': baseline, 'recovery': recovery,
                               'requests_sent': budget.sent - initial, 'credential_mode': 'single key',
                               'load_isolation': plan.get('load_isolation', 'unknown'),
                               'credential_id': plan.get('credential_id', 'unrecorded'),
                               'capacity_3way': capacity_lines([d['capacity_window'] for d in details])
                                   if item == 'CAP-04' else None})
        result.add('all_windows_measured', True, len(rows),
                   len(rows) == len(stage['users']) * stage.get('windows', 1) and all(l.enough_sample for l in rows))
        if item == 'CAP-06':
            complete = all(h['attempted'] == plan['baseline_turns'] and h['successes'] == h['attempted']
                           and h['p95'] is not None for h in (baseline, recovery))
            result.add('recovery_health', True, recovery, complete)
            result.add('recovery_latency', f"<= baseline*(1+{plan['recovery_tolerance']})",
                       recovery['p95'], None if not complete else
                       recovery['p95'] <= baseline['p95'] * (1 + plan['recovery_tolerance']))
        else:
            result.add('all_windows_meet_slo', True, [l.meets_slo for l in rows],
                       None if not rows else all(l.meets_slo is True for l in rows))
        grouped = []
        for n in stage['users']:
            group = [l for l in rows if l.users == n]
            if group:
                g = dataclasses.replace(group[0])
                g.enough_sample = len(group) == stage.get('windows', 1) and all(l.enough_sample for l in group)
                g.meets_slo = g.enough_sample and all(l.meets_slo is True for l in group)
                if g.enough_sample:
                    grouped.append(g)  # budget/sample shortage is not an observed SLO failure boundary
        result.metrics['capacity_conclusion'] = capacity_conclusion(grouped, slo)
        if any(window_status(d['capacity_window'], slo.turn_p95_s) == 'invalid' for d in details):
            result.metrics['capacity_conclusion'].update(
                statements=['experimental validity unconfirmed: samples, client validation, shared load or pressure resources; no verified capacity'],
                verified_users=None, boundary=None, non_monotonic=False, max_unknown=True)
        if result.metrics['capacity_conclusion']['non_monotonic']:
            result.metrics['capacity_conclusion']['verified_users'] = None
            result.metrics['capacity_conclusion']['boundary'] = None
            result.metrics['capacity_conclusion']['statements'] = ['non-monotonic SLO results; reliable capacity unconfirmed']
        if item != 'CAP-04':
            result.metrics['capacity_conclusion'] = {'statements': ['boundary/recovery measurement only; no sustained capacity conclusion']}
        record = store.write_json(f'capacity-suite/{instance}/summary.json', result.metrics,
                                  instances=[instance], kind='capacity_windows')
        result.evidence.append(record['rel_path'])
        results.append(result.finalize().to_dict())
    return {'run_id': run_id, 'plan': plan, 'requests_sent': budget.sent,
            'admission_reserved': budget.reserved, 'all_workers_drained': True, 'instances': results}
