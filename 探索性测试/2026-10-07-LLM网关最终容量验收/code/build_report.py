"""Offline acceptance report builder for 2026-10-07-LLM网关最终容量验收."""
import json, math
from datetime import datetime, timezone, timedelta
from pathlib import Path

TASK = Path(__file__).resolve().parents[1]
TIERS = [55, 60, 80, 85, 200, 210]
THRESH = {55: 3, 60: 3, 80: 5, 85: 5, 200: 10, 210: 10}
TXT_THRESH = [3, 5, 10]


def load_dir(sub):
    d = TASK / 'results' / sub
    out = {}
    if d.exists():
        for p in sorted(d.glob('*.json')):
            if p.name.endswith('-recovery.json'):
                continue
            out[p.stem] = json.loads(p.read_text(encoding='utf-8'))
    return out


def pct(vals, q):
    if not vals:
        return None
    s = sorted(vals)
    return round(s[max(0, math.ceil(q / 100.0 * len(s)) - 1)], 6)


def main():
    wins = load_dir('responses-boundary')
    agent = load_dir('standard-agent')

    # Task A: per tier, per window
    a = {}
    for U in TIERS:
        ws = []
        for w in (1, 2):
            key = f'w{U}-win{w}'
            d = wins.get(key)
            if not d:
                ws.append({'window': w, 'missing': True})
                continue
            ws.append({'window': w, 'done': d.get('done'), 'attempted': d['attempted'],
                       'gateway_success_rate': d['gateway_service_success_rate'],
                       'p95': (d['e2e'] or {}).get('p95'), 'quality_mismatch': d['model_quality_mismatch'],
                       'categories': d['categories'], 'peak': d['peak_in_flight_max'],
                       'min_peak_ratio': d['min_peak_ratio'], 'elapsed_s': d['elapsed_s']})
        thr = THRESH[U]
        both = [w for w in ws if not w.get('missing')]
        passes = len(both) == 2 and all(w['gateway_success_rate'] is not None and w['gateway_success_rate'] >= 99
                                        and w['p95'] is not None and w['p95'] <= thr for w in both)
        a[U] = {'threshold_s': thr, 'windows': ws, 'sustained_pass': passes}

    # contiguous boundaries
    def boundary(thr):
        last = None
        for U in TIERS:
            if a.get(U) and a[U]['threshold_s'] == thr and a[U]['sustained_pass']:
                last = U
            elif U in TIERS and a[U]['threshold_s'] == thr:
                return last, U
        return last, None

    exec_summary = {
        'responses_boundary': {str(U): a[U] for U in TIERS},
        'responses_boundary_thresholds': {f'p95<={t}s': list(boundary(t)) for t in TXT_THRESH},
        'standard_agent': {k: {'label': v['label'], 'users': v['users'], 'summary': v['summary'],
                               'peak_in_flight': v['peak_in_flight'], 'duration_s': v['duration_s']} for k, v in agent.items()},
        'client_limits': {str(U): {'min_peak_ratio': a[U]['windows'][0].get('min_peak_ratio') if a[U]['windows'] else None} for U in TIERS},
        'issues': [],
    }
    (TASK / '结果汇总.json').write_text(json.dumps(exec_summary, ensure_ascii=False, indent=2), encoding='utf-8')

    L = ['# LLM 网关最终容量验收报告（待审）', '',
         'Responses API / flash / reasoning.effort=low / 单 key。成功分层：Gateway Service Success（协议+completed+非空内容）与 Agent Task Success 分开；marker 措辞不符只计质量。', '']
    L += ['## 1. Responses 简单请求：持续窗口复核', '',
          '| 档位 | 体验线 | 窗口1 成功率/p95 | 窗口2 成功率/p95 | 持续通过 |', '|---:|---:|---|---|---|']
    for U in TIERS:
        ws = a[U]['windows']
        def cell(w):
            return '缺失' if w.get('missing') else f"{w['gateway_success_rate']}/{w['p95']}"
        L.append(f"| {U} | p95≤{THRESH[U]}s | {cell(ws[0]) if ws else '—'} | {cell(ws[1]) if len(ws)>1 else '—'} | {'是' if a[U]['sustained_pass'] else '否'} |")
    L += ['', '| 体验线 | 持续验证通过档 | 持续验证首失败档 | ×5 总用户 |', '|---|---:|---:|---:|']
    for t in TXT_THRESH:
        lp, ff = boundary(t)
        L.append(f"| p95≤{t}s | {lp if lp is not None else '无'} | {ff if ff is not None else '—'} | {lp*5 if lp else '—'} |")
    L += ['', '## 2. standard Agent 真实负载', '']
    L += ['| 档位 | 任务数 | Agent成功率% | 网关成功率% | 首反馈p95 | 任务E2E p95 | 工具成功率% |', '|---|---:|---:|---:|---:|---:|---:|']
    for k in sorted(agent, key=lambda x: agent[x]['users']):
        s = agent[k]['summary']
        L.append(f"| {k} | {s['tasks']} | {s['task_success_rate']} | {s['gateway_success_rate']} | "
                 f"{(s['first_feedback'] or {}).get('p95')} | {(s['task_e2e'] or {}).get('p95')} | {s['tool_call_success']} |")
    L += ['', '## 3. 逐窗口明细', '']
    for U in TIERS:
        for w in a[U]['windows']:
            L.append(f"- n={U} win{w.get('window')}: {json.dumps({k: v for k, v in w.items() if k != 'window'}, ensure_ascii=False)}")
    (TASK / '验收报告.md').write_text('\n'.join(L), encoding='utf-8')
    print('wrote 结果汇总.json + 验收报告.md; thresholds', exec_summary['responses_boundary_thresholds'])
    print('agent:', {k: agent[k]['summary']['task_success_rate'] for k in agent})


if __name__ == '__main__':
    main()
