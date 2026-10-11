"""todo_2 离线汇总：从 results/ 的逐 wave JSON 生成 结果汇总.json + 延迟容量表.md。"""
import hashlib, json, math
from pathlib import Path

TASK = Path(__file__).resolve().parents[1]
THRESH = [3, 5, 10]


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


def load_waves(sub):
    out = []
    for p in sorted((TASK / 'results' / sub).glob('w*.json')):
        out.append(json.loads(p.read_text(encoding='utf-8')))
    return out


def tier_summary(waves, n):
    ws = [w for w in waves if w['planned_concurrency'] == n]
    turns = [t for w in ws for t in w['turns']]
    ok = [t for t in turns if t['ok']]
    e2e = [round(t['end'] - t['start'], 6) for t in ok]
    first = [t['first_text_turn_rel'] for t in ok if t.get('first_text_turn_rel') is not None]
    cats = {}
    for w in ws:
        for c, v in w['categories'].items():
            cats[c] = cats.get(c, 0) + v
    attempted = len(turns)
    return {
        'planned_concurrency': n, 'waves': len(ws), 'attempted': attempted,
        'successful': len(ok), 'failed': attempted - len(ok),
        'success_rate': round(len(ok) / attempted * 100, 3) if attempted else None,
        'e2e': stat(e2e), 'first_text': stat(first),
        'categories': cats,
        'peak_in_flight_max': max((w['actual_peak_in_flight'] for w in ws), default=None),
        'min_peak_ratio': round(min((w['actual_peak_in_flight'] / w['planned_concurrency'] for w in ws), default=0), 4),
        'launch_spread_max': max((w['launch_spread_s'] for w in ws), default=None),
        'wall_clock_s': round(sum(w['wall_clock_s'] for w in ws), 3),
        'client_cpu_max': max((w['client_cpu_max'] for w in ws if w['client_cpu_max'] is not None), default=None),
        'client_mem_mb_max': max((w['client_mem_mb_max'] for w in ws if w['client_mem_mb_max'] is not None), default=None),
        'client_threads_max': max((w['client_threads_max'] for w in ws if w['client_threads_max'] is not None), default=None),
    }


def _walk(tiers, pred):
    """Contiguous prefix: last passing tier before the first failure (ascending)."""
    last_pass = None
    for t in sorted(tiers, key=lambda x: x['planned_concurrency']):
        if pred(t):
            last_pass = t['planned_concurrency']
        else:
            return last_pass, t['planned_concurrency']
    return last_pass, None


def boundary(tiers, thr):
    return _walk(tiers, lambda t: t['success_rate'] is not None and t['success_rate'] >= 99
                 and t['e2e'] and t['e2e']['p95'] is not None and t['e2e']['p95'] <= thr)


def boundary_lat(tiers, thr):
    return _walk(tiers, lambda t: t['e2e'] and t['e2e']['p95'] is not None and t['e2e']['p95'] <= thr)


def curve_table(tiers):
    L = ['| 并发 | 成功率% | E2E p50 | E2E p95 | E2E max | 首正文p95 | 峰值在途 | 峰值比 |',
         '|---:|---:|---:|---:|---:|---:|---:|---:|']
    for t in tiers:
        e = t['e2e'] or {}
        f = t['first_text'] or {}
        L.append(f"| {t['planned_concurrency']} | {t['success_rate']} | {e.get('p50')} | {e.get('p95')} | {e.get('max')} | "
                 f"{f.get('p95')} | {t['peak_in_flight_max']} | {t['min_peak_ratio']} |")
    return L


def cap_table(tiers, label):
    L = ['| 延迟要求 | 已验证同时活跃' + ('用户' if label == 'simple-text' else 'Agent') +
         ' | 首个不满足档位 | 边界 | ×5总用户 |', '|---|---:|---:|---|---:|']
    for thr in THRESH:
        lp, ff = boundary(tiers, thr)
        if lp is None:
            interval = '未测到通过档'
            total = '—'
        elif ff is None:
            interval = f'≥{lp}（最高档仍通过，最大值未知）'
            total = f'≥{lp*5}'
        else:
            interval = f'{lp}～{ff}'
            total = f'{lp*5}'
        L.append(f"| p95 ≤{thr}s | {lp if lp is not None else '无'} | {ff if ff is not None else '未出现'} | {interval} | {total} |")
    return L


def cap_table_lat(tiers, label):
    L = ['| 延迟要求 | 已验证同时活跃' + ('用户' if label == 'simple-text' else 'Agent') +
         ' | 首个不满足档位 | 边界 | ×5总用户 |', '|---|---:|---:|---|---:|']
    for thr in THRESH:
        lp, ff = boundary_lat(tiers, thr)
        if lp is None:
            interval, total = '未测到通过档', '—'
        elif ff is None:
            interval, total = f'≥{lp}（最高档仍通过，最大值未知）', f'≥{lp*5}'
        else:
            interval, total = f'{lp}～{ff}', f'{lp*5}'
        L.append(f"| p95 ≤{thr}s | {lp if lp is not None else '无'} | {ff if ff is not None else '未出现'} | {interval} | {total} |")
    return L


def main():
    text_waves = load_waves('simple-text')
    tool_waves = load_waves('agent-tool')
    text_tiers = [tier_summary(text_waves, n) for n in sorted({w['planned_concurrency'] for w in text_waves})]
    tool_tiers = [tier_summary(tool_waves, n) for n in sorted({w['planned_concurrency'] for w in tool_waves})]

    summary = {'throughputs': {},
               'simple-text': {'tiers': text_tiers},
               'agent-tool': {'tiers': tool_tiers}}
    for label, tiers in (('simple-text', text_tiers), ('agent-tool', tool_tiers)):
        summary[label]['boundaries'] = {f'p95<={t}s': boundary(tiers, t) for t in THRESH}
    (TASK / '结果汇总.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')

    L = ['# LLM 网关容量-延迟曲线补测（todo_2）', '',
         'Responses API / flash / reasoning.effort=low / 单 key / 简单短文本与轻量工具 turn。',
         'SLO：成功率 ≥99% 且 E2E p95 ≤ 阈值。E2E 分位只统计成功 turn。', '']
    L += ['## 表 1：简单文本请求', '']
    L += cap_table(text_tiers, 'simple-text')
    L += ['', '## 表 2：轻量工具 Agent', '']
    L += cap_table(tool_tiers, 'agent-tool')
    L += ['', '## 表 1b：简单文本（仅延迟口径，不计模型合规）', '',
          '> 只看 E2E p95 ≤ 阈值；成功率（含模型未按要求回显的 ~1% 波动）另见逐档明细。', '']
    L += cap_table_lat(text_tiers, 'simple-text')
    L += ['', '## 表 2b：轻量工具 Agent（仅延迟口径）', '']
    L += cap_table_lat(tool_tiers, 'agent-tool')
    L += ['', '## 完整延迟曲线：简单文本', '']
    L += curve_table(text_tiers)
    L += ['', '## 完整延迟曲线：轻量工具 Agent', '']
    L += curve_table(tool_tiers)
    L += ['', '## 关键结论', '']
    for label, tiers, unit in (('simple-text', text_tiers, '用户'), ('agent-tool', tool_tiers, 'Agent')):
        if not tiers:
            continue
        L.append(f'### 简单文本' if label == 'simple-text' else '### 轻量工具 Agent')
        L.append('')
        L.append('- 严格口径（成功率≥99% 且 p95≤阈值）：')
        for thr in THRESH:
            lp, ff = boundary(tiers, thr)
            if lp is None:
                L.append(f'  - p95≤{thr}s：无通过档（最小档 {tiers[0]["planned_concurrency"]} 即未满足）。')
            elif ff is None:
                L.append(f'  - p95≤{thr}s：已验证下界 ≥{lp} {unit}，最大容量未知。')
            else:
                L.append(f'  - p95≤{thr}s：已验证支持 {lp} 个同时活跃{unit}，{ff} 档未满足；容量边界位于 {lp}～{ff}；按 ×5 约 {lp*5} 总{unit}。')
        L.append('- 仅延迟口径（只看 p95≤阈值，不计模型 ~1% 未按要求回显）：')
        for thr in THRESH:
            lp, ff = boundary_lat(tiers, thr)
            if lp is None:
                L.append(f'  - p95≤{thr}s：无通过档。')
            elif ff is None:
                L.append(f'  - p95≤{thr}s：已验证下界 ≥{lp} {unit}，最大容量未知。')
            else:
                L.append(f'  - p95≤{thr}s：已验证支持 {lp} 个同时活跃{unit}，{ff} 档未满足；边界 {lp}～{ff}；按 ×5 约 {lp*5} 总{unit}。')
        L.append('')

    L += ['', '## 逐档明细', '']
    for label, tiers, name in (('simple-text', text_tiers, '简单文本'), ('agent-tool', tool_tiers, '工具 Agent')):
        L.append(f'### {name}')
        L.append('')
        L.append('| 并发 | waves | 尝试 | 成功 | 失败 | 成功率% | 429 | 5xx | timeout | conn | incomplete | mismatch | 客户端CPU峰值 | 客户端内存MB | 客户端线程 |')
        L.append('|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
        for t in tiers:
            c = t['categories']
            L.append(f"| {t['planned_concurrency']} | {t['waves']} | {t['attempted']} | {t['successful']} | {t['failed']} | "
                     f"{t['success_rate']} | {c.get('http_429',0)} | {c.get('http_5xx',0)} | {c.get('timeout',0)} | "
                     f"{c.get('connection_error',0)} | {c.get('incomplete',0)} | {c.get('content_mismatch',0)} | "
                     f"{t['client_cpu_max']} | {t['client_mem_mb_max']} | {t['client_threads_max']} |")
        L.append('')
    (TASK / '延迟容量表.md').write_text('\n'.join(L), encoding='utf-8')
    print('wrote 延迟容量表.md; text tiers', [t['planned_concurrency'] for t in text_tiers],
          'tool tiers', [t['planned_concurrency'] for t in tool_tiers])


if __name__ == '__main__':
    main()
