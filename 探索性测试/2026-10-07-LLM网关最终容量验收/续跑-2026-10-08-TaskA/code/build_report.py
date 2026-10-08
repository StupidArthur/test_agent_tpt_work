"""Offline summariser for the 续跑-2026-10-08-TaskA round.

Reads results/w{U}-win{w}.json + .raw.jsonl (any number of windows per tier) and
produces 结果汇总.json + 验收报告-续跑.md. No network access. Deterministic.
"""
from __future__ import annotations
import json
import math
import glob
import os
import re
from pathlib import Path

ROUND = Path(__file__).resolve().parents[1]
RES = ROUND / 'results'
THRESH = {55: 3, 60: 3, 70: 3, 80: 5, 85: 5, 100: 5, 200: 10, 210: 10}
LINES = ['p95<=3s', 'p95<=5s', 'p95<=10s']
LINE_T = {'p95<=3s': 3, 'p95<=5s': 5, 'p95<=10s': 10}
INITIAL = {'p95<=3s': (55, 60), 'p95<=5s': (80, 85), 'p95<=10s': (200, 210)}


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


def load_raw(label):
    p = RES / f'{label}.raw.jsonl'
    rows = []
    if p.exists():
        for line in p.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def window(label):
    obj = json.loads((RES / f'{label}.json').read_text(encoding='utf-8'))
    raw = load_raw(label)
    gw = [r for r in raw if r.get('gateway_service_success')]
    e2e = [r['e2e'] for r in gw if r.get('e2e') is not None]
    first = [r['first_text'] for r in gw if r.get('first_text') is not None]
    attempted = obj['attempted']
    rate = round(len(gw) / attempted * 100, 3) if attempted else None
    return {
        'label': label, 'planned_concurrency': obj['planned_concurrency'], 'done': obj['done'],
        'elapsed_s': obj['elapsed_s'], 'bursts': obj['bursts'], 'attempted': attempted,
        'gateway_service_success': len(gw), 'gateway_service_success_rate': rate,
        'model_quality_mismatch': obj.get('model_quality_mismatch'),
        'categories': obj.get('categories', {}),
        'e2e': stat(e2e) or obj.get('e2e'), 'first_text': stat(first) or obj.get('first_text'),
        'min_peak_ratio': obj.get('min_peak_ratio'), 'peak_in_flight_max': obj.get('peak_in_flight_max'),
        'max_launch_spread_s': obj.get('max_launch_spread_s'),
        'client_cpu_max': obj.get('client_cpu_max'), 'client_rss_mb_max': obj.get('client_rss_mb_max'),
        'client_threads_max': obj.get('client_threads_max'), 'client_tcp_max': obj.get('client_tcp_max'),
        'utc_start': obj.get('utc_start'), 'utc_end': obj.get('utc_end'),
        'beijing_start': obj.get('beijing_start'), 'beijing_end': obj.get('beijing_end'),
        '_e2e_raw': e2e,
    }


def discover_tiers():
    tiers = {}
    for f in glob.glob(str(RES / 'w*-win*.json')):
        m = re.search(r'w(\d+)-win(\d+)\.json$', os.path.basename(f))
        if m:
            tiers.setdefault(int(m.group(1)), []).append(int(m.group(2)))
    return {u: sorted(ws) for u, ws in sorted(tiers.items())}


def main():
    summary = {'round': '续跑-2026-10-08-TaskA', 'responses_boundary': {'tiers': {}, 'judgment': {}},
               'client_limits': {}, 'recovery': [], 'issues': []}
    tier_data = {}
    for U, wnums in discover_tiers().items():
        wins = [window(f'w{U}-win{w}') for w in wnums]
        for w in wins:
            th = THRESH.get(U)
            w['pass_line'] = bool(th and w['gateway_service_success_rate'] is not None and w['gateway_service_success_rate'] >= 99
                                  and w['e2e'] and w['e2e']['p95'] is not None and w['e2e']['p95'] <= th)
            w['client_limited'] = bool(w['min_peak_ratio'] is not None and w['min_peak_ratio'] < 0.90)
        attempted = sum(w['attempted'] for w in wins)
        gw = sum(w['gateway_service_success'] for w in wins)
        e2e = [v for w in wins for v in w['_e2e_raw']]
        comb = {'attempted': attempted, 'gateway_service_success': gw,
                'gateway_service_success_rate': round(gw / attempted * 100, 3) if attempted else None, 'e2e': stat(e2e)}
        all_pass = all(w['pass_line'] for w in wins) if wins else False
        no_client = not any(w['client_limited'] for w in wins)
        sustained = bool(wins and all_pass and no_client)
        td = {'tier': U, 'threshold_s': THRESH.get(U), 'windows': wins, 'combined': comb,
              'all_windows_pass': bool(all_pass), 'any_client_limited': (not no_client), 'sustained_pass': sustained}
        tier_data[U] = td
        summary['responses_boundary']['tiers'][str(U)] = td
        if td['any_client_limited']:
            summary['client_limits'][f'w{U}'] = [w['label'] for w in wins if w['client_limited']]
        for w in wins:
            w.pop('_e2e_raw', None)

    # per-line capacity using all tested tiers
    judgment = {}
    line_matrix = {}
    for line in LINES:
        t = LINE_T[line]
        tested = sorted(u for u in tier_data if len(tier_data[u]['windows']) >= 2)
        rows = {}
        for u in tested:
            wins = tier_data[u]['windows']
            row_pass = all((w['gateway_service_success_rate'] >= 99) and (w['e2e'] and w['e2e']['p95'] is not None)
                           and w['e2e']['p95'] <= t and not w['client_limited'] for w in wins)
            rows[u] = row_pass
        line_matrix[line] = rows
        passing = [u for u in tested if rows[u]]
        pass_tier = max(passing) if passing else None
        first_fail = min([u for u in tested if not rows[u] and (pass_tier is None or u > pass_tier)], default=None)
        ip, if_ = INITIAL[line]
        consistent = bool(pass_tier == ip and first_fail == if_)
        judgment[line] = {'threshold_s': t, 'initial_pass': ip, 'initial_first_fail': if_,
                          'sustained_pass': pass_tier, 'sustained_first_fail': first_fail,
                          'consistent_with_initial': consistent,
                          'planning_users_x5': (pass_tier * 5) if pass_tier else None}
    summary['responses_boundary']['judgment'] = judgment
    summary['responses_boundary']['line_matrix'] = line_matrix

    rec = RES / 'responses-boundary-recovery.json'
    if rec.exists():
        summary['recovery'] = json.loads(rec.read_text(encoding='utf-8'))
    summary['issues'] = [
        {'id': 'A-INT-01', 'kind': 'execution', 'desc': '第1次后台运行在 w200-win1 进行到482s时会话挂起被杀；该窗口已重跑，其余8窗未受影响。'},
        {'id': 'A-CLI-01', 'kind': 'client_limit', 'desc': '200/210 档出现客户端受限：峰值比最低0.72/0.33，单波 launch_spread 最大8.4s，连接错误集中在个别波。相关窗口按 README 4.5 标 client_limited。'},
        {'id': 'A-RC-01', 'kind': 'recheck', 'desc': '初筛候选通过档200未在两个窗口都满足，按 README 4.4 补跑 w200-win3 复核窗口（保留 win1/win2）。'},
    ]

    # ------- markdown -------
    L = []
    L.append('# 续跑-2026-10-08-TaskA 验收报告（Task A：Responses 持续边界复核，待审）')
    L.append('')
    L.append('Responses API / `flash` / `reasoning.effort=low` / 流式 / `max_output_tokens=256` / 单 key / 简单唯一 marker 文本。')
    L.append('判据：某档对某体验线“持续通过” = 该档**所有有效窗口**均 `Gateway Service Success Rate >= 99%` 且 `E2E p95 <= 阈值`，且无窗口 `client_limited`。')
    L.append('')
    L.append('## 1. 结论（对应原 README 第十节 Responses 表）')
    L.append('')
    L.append('| 体验线 | 初筛通过档 | 初筛首失败档 | **持续通过档** | **持续首失败档** | 与初筛一致 | ×5 规划总用户 |')
    L.append('|---|---:|---:|---:|---:|---|---:|')
    for line in LINES:
        j = judgment[line]
        L.append(f"| {line} | {j['initial_pass']} | {j['initial_first_fail']} | {j['sustained_pass'] if j['sustained_pass'] is not None else '未确认'} | "
                 f"{j['sustained_first_fail'] if j['sustained_first_fail'] is not None else '未确认'} | {'是' if j['consistent_with_initial'] else '否'} | {j['planning_users_x5'] if j['planning_users_x5'] else '—'} |")
    L.append('')
    L.append('## 1b. 各档对各体验线的判定矩阵')
    L.append('')
    L.append('| 档位 | 窗口数 | 成功率%(合并) | E2E p95(合并) | 客户端受限 | 3s | 5s | 10s |')
    L.append('|---:|---:|---:|---:|---|---|---|---|')
    for U in sorted(tier_data):
        td = tier_data[U]
        c = td['combined']
        marks = []
        for line in LINES:
            marks.append('✓' if line_matrix.get(line, {}).get(U) else '✗')
        L.append(f"| {U} | {len(td['windows'])} | {c['gateway_service_success_rate']} | {(c['e2e'] or {}).get('p95')} | "
                 f"{td['any_client_limited']} | {marks[0]} | {marks[1]} | {marks[2]} |")
    L.append('')
    L.append('> 判定依据：该档**所有窗口**均满足 `成功率>=99%` 且 `E2E p95<=阈值` 且无窗口客户端受限。')
    L.append('## 2. 逐窗明细（全部窗口）')
    L.append('')
    L.append('| 档位 | 窗口 | 时长s | 尝试 | 网关成功 | 成功率% | E2E p50 | E2E p95 | 首正文p95 | 峰值比 | 本窗判定 | 客户端受限 |')
    L.append('|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|')
    for U in sorted(tier_data):
        for w in tier_data[U]['windows']:
            e = w['e2e'] or {}
            ft = (w['first_text'] or {}).get('p95')
            L.append(f"| {U} | {w['label']} | {w['elapsed_s']} | {w['attempted']} | {w['gateway_service_success']} | {w['gateway_service_success_rate']} | "
                     f"{e.get('p50')} | {e.get('p95')} | {ft} | {w['min_peak_ratio']} | {'通过' if w['pass_line'] else '未通过'} | {w['client_limited']} |")
    L.append('')
    L.append('## 3. 逐档合并')
    L.append('')
    L.append('| 档位 | 阈值s | 窗数 | 尝试 | 网关成功 | 成功率% | E2E p95 | 各窗均通过 | 持续通过 | 客户端受限 |')
    L.append('|---:|---:|---:|---:|---:|---:|---:|---|---|---|')
    for U in sorted(tier_data):
        td = tier_data[U]
        c = td['combined']
        L.append(f"| {U} | {td['threshold_s']} | {len(td['windows'])} | {c['attempted']} | {c['gateway_service_success']} | {c['gateway_service_success_rate']} | "
                 f"{(c['e2e'] or {}).get('p95')} | {td['all_windows_pass']} | {td['sustained_pass']} | {td['any_client_limited']} |")
    L.append('')
    L.append('## 4. 各类失败计数（每档所有窗口合并）')
    L.append('')
    L.append('| 档位 | 429 | 5xx | timeout | connection | incomplete | protocol | mismatch | client |')
    L.append('|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
    for U in sorted(tier_data):
        cats = {}
        for w in tier_data[U]['windows']:
            for k, v in (w['categories'] or {}).items():
                cats[k] = cats.get(k, 0) + v
        L.append(f"| {U} | {cats.get('http_429',0)} | {cats.get('http_5xx',0)} | {cats.get('timeout',0)} | {cats.get('connection_error',0)} | "
                 f"{cats.get('incomplete',0)} | {cats.get('protocol_error',0)} | {sum(w['model_quality_mismatch'] or 0 for w in tier_data[U]['windows'])} | {cats.get('client_error',0)} |")
    L.append('')
    L.append('## 5. 窗口间恢复检查（每窗后 10 次低负载）')
    L.append('')
    L.append('| 时点 | 尝试 | 成功 | E2E p95 |')
    L.append('|---|---:|---:|---:|')
    for r in summary['recovery']:
        L.append(f"| {r['after']} | {r['attempted']} | {r['success']} | {(r['e2e'] or {}).get('p95')} |")
    L.append('')
    L.append('## 6. 客户端资源与有效性')
    L.append('')
    L.append('| 档位 | CPU% max | RSS MB max | threads max | TCP max | min 峰值比 | max launch spread s |')
    L.append('|---:|---:|---:|---:|---:|---:|---:|')
    for U in sorted(tier_data):
        ws = tier_data[U]['windows']
        if not ws:
            continue
        L.append(f"| {U} | {max((w['client_cpu_max'] or 0) for w in ws)} | {max((w['client_rss_mb_max'] or 0) for w in ws)} | "
                 f"{max((w['client_threads_max'] or 0) for w in ws)} | {max((w['client_tcp_max'] or 0) for w in ws)} | "
                 f"{min((w['min_peak_ratio'] if w['min_peak_ratio'] is not None else 1) for w in ws)} | {max((w['max_launch_spread_s'] or 0) for w in ws)} |")
    L.append('')
    L.append('## 7. 重要说明')
    L.append('')
    L.append('- 失败计数中 `incomplete` 与 `connection`/`protocol` 属网关服务失败；`mismatch` 为模型未严格逐字符回显，**不计**网关失败。')
    L.append('- 客户端 TCP 为“每波结束后采样”，非峰值；客户端有效性主要依据 min 峰值比（<0.90 视为该窗客户端受限）与 launch_spread。')
    L.append('- 200/210 档的 `connection` 错误集中在个别波，且与峰值比下降、launch_spread 增大同时出现，**不能**干净归因为网关内部失败，相关窗口已标 `client_limited`。')
    L.append('- 报告仅覆盖本子目录本轮数据，未修改任何历史证据；Task B 未重跑。')
    L.append('')

    (ROUND / '结果汇总.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    (ROUND / '验收报告-续跑.md').write_text('\n'.join(L), encoding='utf-8')
    print('wrote 结果汇总.json and 验收报告-续跑.md')
    for line in LINES:
        print(line, judgment[line])


if __name__ == '__main__':
    main()
