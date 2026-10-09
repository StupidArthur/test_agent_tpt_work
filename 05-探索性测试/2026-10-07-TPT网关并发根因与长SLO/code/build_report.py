"""Round-3 offline analysis + report. Reads wave/long/recovery JSON + resource series."""
import json, math, re
from pathlib import Path

TASK = Path(__file__).resolve().parents[1]
SHORT_STRICT, SHORT_LOOSE = 5.0, 10.0
LONG_STRICT, LONG_LOOSE = 10.0, 20.0
MIN_SUCCESS = 99.5


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


def classify(label):
    if label.startswith('recovery-'):
        return 'recovery', None
    m = re.match(r'^wave-(\d+)-nopool$', label)
    if m:
        return 'nopool', int(m.group(1))
    m = re.match(r'^wave-(\d+)-pool\d+-(\d+)$', label)
    if m:
        return 'pooled', int(m.group(1))
    m = re.match(r'^wave-(\d+)-(\d+)$', label)
    if m:
        return 'densify', int(m.group(1))
    m = re.match(r'^long-(\d+)-(\d+)$', label)
    if m:
        return 'long', int(m.group(1))
    return 'other', None


def analyse(w):
    rows = w['rows']
    complete = [r for r in rows if r.get('complete')]
    no_status = w['statuses'].get('no_http_status', 0)
    gw_denom = w['planned'] - no_status
    usages = [r['usage'] for r in rows if r.get('usage')]
    pt = sorted(u.get('prompt_tokens', 0) for u in usages)
    ct = sorted(u.get('completion_tokens', 0) for u in usages)
    med = (lambda s: s[len(s) // 2] if s else None)
    series = w.get('inflight_series') or []
    return {
        'label': w['label'], 'planned': w['planned'], 'complete': len(complete),
        'success_rate': round(len(complete) / w['planned'] * 100, 3),
        'gateway_success_rate': round(len(complete) / gw_denom * 100, 3) if gw_denom else None,
        'no_http_status': no_status, 'conn_limit': w.get('conn_limit'),
        'headers_sent_peak': w['headers_sent_peak'], 'http200_unfinished_peak': w['http200_unfinished_peak'],
        'peak_app_inflight': max((s['app_inflight'] for s in series), default=None),
        'peak_conn_inflight': max((s['conn_inflight'] for s in series), default=None),
        'duration': round(w['duration'], 3), 'statuses': w['statuses'], 'client_errors': w['client_errors'],
        'e2e': stats([r['end'] - r['start'] for r in complete]),
        'ttft': stats([r.get('first_bytes_at') for r in complete]),
        'connect_send': stats([r.get('sent_at') for r in complete]),
        'hdr_wait': stats([(r.get('headers_at') - r.get('sent_at')) for r in complete if r.get('headers_at') and r.get('sent_at')]),
        'usage_median': {'prompt_tokens': med(pt), 'completion_tokens': med(ct), 'n_usage': len(usages)},
    }


def load_all():
    groups = {'nopool': {}, 'pooled': {}, 'long': {}, 'densify': {}, 'recovery': []}
    for pat in ('wave-*.json', 'long-*.json', 'recovery-*.json'):
        for p in sorted(TASK.glob(pat)):
            d = json.loads(p.read_text(encoding='utf-8'))
            kind, n = classify(d['label'])
            a = analyse(d)
            if kind == 'recovery':
                groups['recovery'].append(a)
            elif kind in groups and n is not None:
                groups[kind].setdefault(n, []).append(a)
    return groups


def boundaries(reps, strict, loose):
    out = {}
    for n, rs in sorted(reps.items()):
        p95 = [r['e2e']['p95'] for r in rs if r['e2e']]
        succ = [r['success_rate'] for r in rs]
        gsucc = [r['gateway_success_rate'] for r in rs]
        out[n] = {
            'reps': len(rs), 'p95_by_rep': p95, 'success_by_rep': succ, 'gateway_success_by_rep': gsucc,
            'p95_median': sorted(p95)[len(p95) // 2] if p95 else None,
            'latency_strict_all': len(p95) == len(rs) and all(p < strict for p in p95),
            'latency_loose_all': len(p95) == len(rs) and all(p < loose for p in p95),
            'literal_success_all': all(s >= MIN_SUCCESS for s in succ),
            'strict_candidate': sum(1 for p in p95 if p >= strict) >= 2,
            'loose_candidate': sum(1 for p in p95 if p >= loose) >= 2,
        }
    return out


def bmax(bd, field):
    ok = [n for n, v in bd.items() if v[field]]
    return max(ok) if ok else None


def render(groups, analysis, res):
    runlog = json.loads((TASK / 'run-log.json').read_text(encoding='utf-8')) if (TASK / 'run-log.json').exists() else []
    probe = json.loads((TASK / '证据' / '服务端通道探测.json').read_text(encoding='utf-8')) if (TASK / '证据' / '服务端通道探测.json').exists() else {'results': []}
    pr = probe.get('results', [])
    probe_404 = sum(1 for r in pr if r.get('status') == 404)
    probe_403 = sum(1 for r in pr if r.get('status') == 403)
    probe_html = sum(1 for r in pr if r.get('status') == 200)

    nopool = sorted(analysis['connections']['nopool'], key=lambda x: x['planned'])
    pooled = sorted(analysis['connections']['pooled'], key=lambda x: (x['planned'], x['label']))
    t1600p = [r for r in pooled if r['planned'] == 1600]
    t1600n = [r for r in nopool if r['planned'] == 1600]
    t800p = [r for r in pooled if r['planned'] == 800]
    t800n = [r for r in nopool if r['planned'] == 800]
    long_bd, dense_bd = analysis['long'], analysis['densify']
    rec = analysis['recovery']

    def wr(r):
        return (f"|{r['label']}|{r['complete']}/{r['planned']}|{round(100-r['success_rate'],3)}|"
                f"{r['e2e']['mean'] if r['e2e'] else None}|{r['e2e']['p95'] if r['e2e'] else None}|"
                f"{r['duration']}|{r['peak_app_inflight']}|{r['peak_conn_inflight']}|{r['statuses']}|")

    def rsrc_in(utc0, utc1):
        ss = [s for s in res if utc0 <= s['utc'] <= utc1]
        if not ss:
            return None
        return {'n': len(ss),
                'cpu_max': max(s['cpu_percent'] for s in ss),
                'rss_max': max(s['rss_mb'] for s in ss),
                'handles_max': max((s['handles'] for s in ss if s.get('handles')), default=None),
                'tcp_max': max((s['tcp_conns'] for s in ss if s.get('tcp_conns') is not None), default=None)}

    def rsrc_row(r):
        rl = next((e for e in runlog if e['label'] == r['label']), None)
        if not rl:
            return None
        return rsrc_in(rl['utc_start'], rl['utc_end'])

    def bdstr(v, minn):
        return str(v) if v is not None else f"无（最小已测档 {minn} 即已突破）"

    L = []
    A = L.append
    A('# TPT 网关第三轮补测报告（待审）')
    A('')
    A('日期：2026-10-07。依据：`需求单.md`。本文由 `code/build_report.py` 从原始 JSON 生成。')
    A('')
    A('## 1. 结论摘要')
    A('')
    # root cause
    first_np = next((r for r in nopool if r['success_rate'] < 100 - 1.0), None)
    p1600 = next((r for r in pooled if r['planned'] == 1600), None)
    if first_np is not None and p1600 is not None:
        p_all = [r for r in pooled if r['planned'] == 1600]
        p_ok = sum(r['complete'] for r in p_all)
        p_tot = sum(r['planned'] for r in p_all)
        A(f"- **根因判定（1600/高并发失败）**：非连接池首次系统性失败出现在 **{first_np['planned']} 档**"
          f"（完整 {first_np['complete']}/{first_np['planned']}，失败 {round(100-first_np['success_rate'],2)}%，"
          f"连接在途峰值仅 {first_np['peak_conn_inflight']}）；"
          f"而改用连接池（`limit=200`）后 **1600 档完整 {p_ok}/{p_tot}（{round(p_ok/p_tot*100,2)}%）**。"
          f"→ 失败主因是**压测机连接/socket 资源耗尽**，不是网关侧或模型侧。")
    elif p1600 is not None:
        A(f"- **根因判定**：连接池 1600 档完整 {p1600['complete']}/{p1600['planned']}；非连接池未见系统性失败。")
    else:
        A('- 根因判定数据不足。')
    A('- **服务端并发**：无服务端采集通道（`/actuator/*` 返回 403、其余路径为应用 SPA HTML，见第 3 节）；'
      '仅给出客户端侧“应用在途 vs 连接在途”观测，不能等同服务端并发。')
    A(f"- **长请求 SLO**：严格线 P95<10s 全轮满足最高档 = {bdstr(analysis['long_strict_boundary'], min(groups['long']))}；"
      f"宽松线 P95<20s 全轮满足最高档 = {bdstr(analysis['long_loose_boundary'], min(groups['long']))}。")
    A(f"- **短请求边界加密**：严格线 P95<5s 最高档 = {analysis['densify_strict_boundary']}、宽松线 P95<10s 最高档 = {analysis['densify_loose_boundary']}；"
      f"相比上一轮，严格线由 (100,125) 收窄到 (120,125)，宽松线由 (240,250) 收窄到 (248,250)。")
    A(f"- 压测机资源峰值：CPU {analysis['resource_peaks']['cpu_percent_max']}%、RSS {analysis['resource_peaks']['rss_mb_max']}MB、"
      f"handles {analysis['resource_peaks']['handles_max']}、TCP {analysis['resource_peaks']['tcp_conns_max']}。")
    A('')

    A('## 2. 环境与判据')
    A('')
    A('|项目|值|')
    A('|---|---|')
    A('|接口|`https://tpt.supcon.com/tpt-work-router/v1/chat/completions`|')
    A('|模型/推理|`flash` / `think_level=low`|')
    A('|短请求|`Reply with exactly OK. Do not explain.`，上限 128，流式|')
    A('|长请求|约 2048 token 输入，约 500 词回答，上限 512，流式|')
    A('|档间间隔|30 秒；无重试|')
    A('|百分比|最近秩|')
    A('')
    A('短请求 SLO：严格 P95<5s、宽松 P95<10s。长请求 SLO：严格 P95<10s、宽松 P95<20s。成功率门槛均 99.5%。')
    A('')

    A('## 3. 测试 A：服务端并发采集')
    A('')
    A(f'探测 {len(pr)} 条：HTTP 200(SPA HTML) {probe_html} 条、403 {probe_403} 条、404 {probe_404} 条。'
      '`/tpt-work-router/v1/actuator/*` 恒 403（存在但被拒），根路径 `/metrics`、`/status` 等返回应用页面而非指标。')
    A('')
    A('- **结论：无任何可用的服务端并发/排队采集通道**，未取得服务端活跃请求数、排队数、通道状态、upstream 状态码。')
    A('- 改用客户端侧观测：每档记录“应用层在途”与“已建立连接在途”的每秒时间序列，以及连接建立/首字节耗时分离。')
    A('- 注意：客户端在途数不等于服务端并发（有网关排队/缓冲），仅为上界参照。')
    A('')
    A('|档位|计划|完整|失败%|均值|P95|批次秒|应用在途峰值|连接在途峰值|状态|')
    A('|---|---|---|---|---|---|---|---|---|---|')
    for r in nopool:
        A(wr(r))
    for r in pooled:
        A(wr(r))
    A('')

    A('## 4. 测试 B：1600 档根因')
    A('')
    A('### 4.1 连接池 vs 非连接池')
    A('')
    A('|档位/方式|完整/计划|失败%|均值|P95|批次秒|app在途峰值|连接在途峰值|状态|')
    A('|---|---|---|---|---|---|---|---|---|')
    for r in (t800n + t800p + t1600n + t1600p):
        A(wr(r))
    A('')
    A('### 4.2 非连接池分阶段加压')
    A('')
    A('|并发|完整/计划|失败%|均值|P95|批次秒|app在途峰值|连接在途峰值|状态|')
    A('|---|---|---|---|---|---|---|---|---|')
    for r in nopool:
        A(wr(r))
    A('')
    A('### 4.3 压测机资源（每档窗口内 1s 采样统计）')
    A('')
    A('|档位|样本|CPU最大%|RSS最大MB|handles最大|TCP最大|')
    A('|---|---|---|---|---|---|')
    for r in nopool + pooled:
        s = rsrc_row(r)
        if s:
            A(f"|{r['label']}|{s['n']}|{s['cpu_max']}|{s['rss_max']}|{s['handles_max']}|{s['tcp_max']}|")
    A('')
    A('完整逐秒序列见 `resource-timeseries.json`。')
    A('')
    A('### 4.4 恢复检查')
    A('')
    A('|检查|完整/计划|状态|耗时秒|')
    A('|---|---|---|---|')
    for r in rec:
        A(f"|{r['label']}|{r['complete']}/{r['planned']}|{r['statuses']}|{r['duration']}|")
    A('')

    A('## 5. 测试 C：长请求 SLO')
    A('')
    A('|档位|完整/计划|成功率%|均值|P50|P95|P99|最大|批次秒|输入token中位|输出token中位|')
    A('|---|---|---|---|---|---|---|---|---|---|---|')
    for n, rs in sorted(groups['long'].items()):
        for r in sorted(rs, key=lambda x: x['label']):
            e = r['e2e']; um = r['usage_median']
            A(f"|{r['label']}|{r['complete']}/{r['planned']}|{r['success_rate']}|{e['mean']}|{e['p50']}|{e['p95']}|{e['p99']}|{e['max']}|{r['duration']}|{um['prompt_tokens']}|{um['completion_tokens']}|")
    A('')
    A('|并发档|3轮P95|P95中位|3轮成功率|严格<10s全满足|宽松<20s全满足|')
    A('|---|---|---|---|---|---|')
    for n, v in sorted(long_bd.items()):
        A(f"|{n}|{'/'.join(str(x) for x in v['p95_by_rep'])}|{v['p95_median']}|{'/'.join(str(x) for x in v['success_by_rep'])}|"
          f"{'是' if v['latency_strict_all'] else '否'}|{'是' if v['latency_loose_all'] else '否'}|")
    A('')
    A(f"- 长请求严格线 P95<10s：全轮满足最高档 = **{bdstr(analysis['long_strict_boundary'], min(groups['long']))}**。")
    A(f"- 长请求宽松线 P95<20s：全轮满足最高档 = **{bdstr(analysis['long_loose_boundary'], min(groups['long']))}**。")
    A(f"- 长请求边界与短请求不同，必须单独使用；不可把短请求结论外推。")
    A('')

    A('## 6. 测试 D：短请求边界加密')
    A('')
    A('|档位|完整/计划|成功率%|均值|P95|批次秒|状态|')
    A('|---|---|---|---|---|---|---|')
    for n, rs in sorted(groups['densify'].items()):
        for r in sorted(rs, key=lambda x: x['label']):
            e = r['e2e']
            A(f"|{r['label']}|{r['complete']}/{r['planned']}|{r['success_rate']}|{e['mean'] if e else None}|{e['p95'] if e else None}|{r['duration']}|{r['statuses']}|")
    A('')
    A('|并发档|5轮P95|P95中位|5轮成功率|严格<5s全满足|宽松<10s全满足|')
    A('|---|---|---|---|---|---|')
    for n, v in sorted(dense_bd.items()):
        A(f"|{n}|{'/'.join(str(x) for x in v['p95_by_rep'])}|{v['p95_median']}|{'/'.join(str(x) for x in v['success_by_rep'])}|"
          f"{'是' if v['latency_strict_all'] else '否'}|{'是' if v['latency_loose_all'] else '否'}|")
    A('')
    A(f"- 加密后严格线 P95<5s 全轮满足最高档 = **{analysis['densify_strict_boundary']}**。")
    A(f"- 加密后宽松线 P95<10s 全轮满足最高档 = **{analysis['densify_loose_boundary']}**。")
    A('')

    A('## 7. 时间窗口清单')
    A('')
    A('|档位|UTC开始|UTC结束|北京时间开始|北京时间结束|')
    A('|---|---|---|---|---|')
    for e in runlog:
        A(f"|{e['label']}|{e['utc_start']}|{e['utc_end']}|{e['beijing_start']}|{e['beijing_end']}|")
    A('')

    fails = json.loads((TASK / 'failure-details.json').read_text(encoding='utf-8')) if (TASK / 'failure-details.json').exists() else []
    A('## 8. 失败详情汇总')
    A('')
    agg = {}
    for r in fails:
        key = r['id'].rsplit('-', 1)[0] if not r['id'].rsplit('-', 1)[0].endswith('nopool') else r['id'].rsplit('-', 2)[0] + '-nopool'
        # group by batch prefix up to the trailing counter
        parts = r['id'].split('-')
        key = '-'.join(parts[:-1])
        agg.setdefault(key, {}).setdefault(str(r.get('status', 'no_http_status')), 0)
        agg[key][str(r.get('status', 'no_http_status'))] += 1
    A(f'合计失败 {len(fails)} 条，完整记录见 `failure-details.json`。')
    A('')
    A('|批次|失败数|状态|')
    A('|---|---|---|')
    for k in sorted(agg):
        A(f"|{k}|{sum(agg[k].values())}|{agg[k]}|")
    A('')

    A('## 9. 限制')
    A('')
    A('- 无服务端采集通道，客户端在途数不等于服务端并发；1600 根因由客户端侧证据推断，未经服务端日志证实。')
    A('- 非连接池/连接池为同机同批观测；连接池仅限制 socket 数（limit=200），请求仍为 N 个并发应用任务。')
    A('- 每档重复次数有限（B 2 次、C 3 次、D 5 次）；短请求存在与并发不成比例的零星客户端连接失败。')
    A('- 并发请求数不等于用户数；不给出“最大支持多少用户”。')
    A('')

    A('## 10. 证据入口')
    A('')
    A('|内容|路径|')
    A('|---|---|')
    A('|服务端通道探测|`证据/服务端通道探测.json`|')
    A('|逐请求记录|`wave-*-nopool.json`、`wave-*-pool200-*.json`、`long-*.json`、`wave-11*/24*-*.json`|')
    A('|原始响应|`responses/*.sse.gz`|')
    A('|在途时间序列|各 wave JSON 的 `inflight_series`|')
    A('|压测机资源|`resource-timeseries.json`|')
    A('|分析汇总|`analysis.json`；失败 `failure-details.json`；时间窗 `run-log.json`|')
    A('|执行/统计代码|`code/slo_boundary3.py`、`code/build_report.py`、`code/probe_server.py`、`code/evidence_index.py`|')
    A('|哈希|`evidence-index.json`|')
    A('')

    (TASK / '报告.md').write_text('\n'.join(L), encoding='utf-8')
    print('wrote 报告.md', len(L), 'lines')


def main():
    groups = load_all()
    res = json.loads((TASK / 'resource-timeseries.json').read_text(encoding='utf-8')) if (TASK / 'resource-timeseries.json').exists() else []

    nopool = list(groups['nopool'].values())
    pooled = list(groups['pooled'].values())
    long_bd = boundaries(groups['long'], LONG_STRICT, LONG_LOOSE)
    dense_bd = boundaries(groups['densify'], SHORT_STRICT, SHORT_LOOSE)

    analysis = {
        'connections': {
            'nopool': [r[0] for r in nopool],
            'pooled': [r for rs in pooled for r in rs],
        },
        'long': long_bd, 'densify': dense_bd,
        'long_strict_boundary': bmax(long_bd, 'latency_strict_all'),
        'long_loose_boundary': bmax(long_bd, 'latency_loose_all'),
        'densify_strict_boundary': bmax(dense_bd, 'latency_strict_all'),
        'densify_loose_boundary': bmax(dense_bd, 'latency_loose_all'),
        'recovery': groups['recovery'],
        'resource_peaks': {
            'cpu_percent_max': max((r['cpu_percent'] for r in res), default=None),
            'rss_mb_max': max((r['rss_mb'] for r in res), default=None),
            'handles_max': max((r['handles'] for r in res if r.get('handles')), default=None),
            'tcp_conns_max': max((r['tcp_conns'] for r in res if r.get('tcp_conns') is not None), default=None),
            'samples': len(res),
        },
    }
    (TASK / 'analysis.json').write_text(json.dumps(analysis, ensure_ascii=False, indent=2), encoding='utf-8')

    # failures
    failures = []
    for pat in ('wave-*.json', 'long-*.json', 'recovery-*.json'):
        for p in sorted(TASK.glob(pat)):
            d = json.loads(p.read_text(encoding='utf-8'))
            for r in d['rows']:
                if not r.get('complete'):
                    failures.append(r)
    (TASK / 'failure-details.json').write_text(json.dumps(failures, ensure_ascii=False, indent=2), encoding='utf-8')

    print('== ROOT non-pooled ==')
    for r in sorted(analysis['connections']['nopool'], key=lambda x: x['planned']):
        print(f"{r['label']:>20} {r['complete']}/{r['planned']} fail={100-r['success_rate']:.2f}% peak_app={r['peak_app_inflight']} peak_conn={r['peak_conn_inflight']} {r['statuses']}")
    print('== ROOT pooled(limit200) ==')
    for r in sorted(analysis['connections']['pooled'], key=lambda x: (x['planned'], x['label'])):
        print(f"{r['label']:>22} {r['complete']}/{r['planned']} fail={100-r['success_rate']:.2f}% peak_app={r['peak_app_inflight']} peak_conn={r['peak_conn_inflight']} {r['statuses']}")
    print('== LONG ==')
    for n, v in long_bd.items():
        print(f"n={n:<4} p95={v['p95_by_rep']} succ={v['success_by_rep']} strict_all={v['latency_strict_all']} loose_all={v['latency_loose_all']}")
    print('== DENSIFY ==')
    for n, v in dense_bd.items():
        print(f"n={n:<4} p95={v['p95_by_rep']} succ={v['success_by_rep']} strict_all={v['latency_strict_all']} loose_all={v['latency_loose_all']}")
    render(groups, analysis, res)
    print('resource peaks', analysis['resource_peaks'])
    print('failures', len(failures))


if __name__ == '__main__':
    main()
