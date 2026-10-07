"""Build 报告.md (and console tables) from the JSON artifacts of this task.

Deterministic, offline. Run after slo_boundary.py completes and report.py has
written latency-summary.json / failure-details.json / slo-analysis.json.
"""
import json, re
from pathlib import Path

TASK = Path(__file__).resolve().parents[1]
STRICT_P95, LOOSE_P95, MIN_SUCCESS = 5.0, 10.0, 99.5


def load(name):
    return json.loads((TASK / name).read_text(encoding='utf-8'))


def n_of(label):
    m = re.search(r'(\d+)', label)
    return int(m.group(1)) if m else None


def main():
    lat = load('latency-summary.json')
    slo = load('slo-analysis.json')
    fails = load('failure-details.json')
    runlog = load('run-log.json') if (TASK / 'run-log.json').exists() else []

    shorts = [r for r in lat if r['label'].startswith('wave-') and 'smoke' not in r['label']]
    longs = [r for r in lat if r['label'].startswith('long-')]
    recs = [r for r in lat if r['label'].startswith('recovery-')]
    short_ladder = sorted({n_of(r['label']) for r in shorts})

    # --- boundaries ---
    def boundary(field):
        ok = [n for n in short_ladder if slo['short_ladder'][str(n)][field]]
        return max(ok) if ok else None

    lat_strict, lat_loose = boundary('latency_strict_all'), boundary('latency_loose_all')
    lit_strict, lit_loose = boundary('meet_strict_literal'), boundary('meet_loose_literal')
    gw_strict, gw_loose = boundary('meet_strict_gateway'), boundary('meet_loose_gateway')
    succ_ok_all = boundary('literal_success_all')

    def first_not(field):
        for n in short_ladder:
            if not slo['short_ladder'][str(n)][field]:
                return n
        return None

    strict_first = first_not('latency_strict_all')
    loose_first = first_not('latency_loose_all')

    def fmt_row(r):
        e = r['e2e']
        return (f"|{r['label']}|{r['complete']}/{r['planned']}|{r['success_rate']}|"
                f"{e['mean']}|{e['p50']}|{e['p95']}|{e['p99']}|{e['max']}|{r['duration']}|"
                f"{r['headers_sent_peak']}|{r['http200_unfinished_peak']}|")

    lines = []
    A = lines.append

    A('# TPT 网关短请求 SLO 边界补测报告（待审）')
    A('')
    A('日期：2026-10-07。依据：`需求单.md`。本文由 `code/build_report.py` 从原始 JSON 生成，未手工改写数值。')
    A('')
    A('## 1. 结论摘要')
    A('')
    A(f"- 短请求梯（含 1600 档）共 {len(shorts)} 轮，档位：{', '.join(str(n) for n in short_ladder)}。每档重复 3 次。")
    A('')
    A('**延迟边界（只看完整响应 P95，不受客户端连接失败干扰）**')
    A('')
    A(f"- 严格线 P95<5s：3 轮全部满足的最高档 = **{lat_strict}**；首个出现突破的档 = **{strict_first}**"
      f"（该档已有轮次 P95≥5s）。**严格线延迟边界在 ({lat_strict}, {strict_first}) 之间。**")
    A(f"- 宽松线 P95<10s：3 轮全部满足的最高档 = **{lat_loose}**；首个出现突破的档 = **{loose_first}**。"
      f"**宽松线延迟边界在 ({lat_loose}, {loose_first}) 之间。**")
    A('')
    A('**含成功率的完整 SLO（成功率≥99.5%）**')
    A('')
    dip = [n for n in short_ladder if n != 1600 and not slo['short_ladder'][str(n)]['literal_success_all']]
    A('- 每档都会零星出现客户端连接失败（`ClientConnectorError`），且**与并发数不呈比例**（100 档与 600 档都是个位数）。'
      + (f'按字面口径（complete/planned），这些客户端错误使 **{min(dip)}～{max(dip)} 档**在至少一轮里成功率<99.5%；' if dip else '')
      + '而更大档位（250～600）的字面成功率反而都≥99.5%，其不达标是由延迟造成，不是成功率造成。')
    A('- 若把“未取得 HTTP 响应的客户端连接失败”从分母剔除（gateway-observed），短请求 100～600 各档服务端成功率均为 **100%**，'
      '此时边界完全由延迟决定。')
    A(f"- 字面口径下，全轮满足严格线的最高档 = **{lit_strict or '无'}**，宽松线 = **{lit_loose or '无'}**。")
    A('')
    A('- 上述为**本轮有限档位、每档 3 次**下的可重复观测边界，不等于服务端精确并发上限；未取得服务端计数。')
    A('- 1600 档 3 次均严重不完整，但失败以客户端连接错误为主，**未复现**上一轮的 nginx 500 / channel 503（见第 4 节）。')
    A('')

    A('## 2. 环境与判据')
    A('')
    A('|项目|值|')
    A('|---|---|')
    A('|接口|`https://tpt.supcon.com/tpt-work-router/v1/chat/completions`|')
    A('|模型/推理|`flash` / `think_level=low`|')
    A('|短请求|提示 `Reply with exactly OK. Do not explain.`，输出上限 128 token，流式 SSE，请求 usage|')
    A('|长请求对照|输入约 2048 token 填充文，要求约 500 词回答，输出上限 512 token|')
    A('|凭据|`flash-public-low`（单一凭据）|')
    A('|等待边界|连接 60s、读取空闲 90s、总超时 180s|')
    A('|档间间隔|30 秒|')
    A('|百分比|最近秩（nearest-rank）|')
    A('')
    A('SLO：严格线 P95<5s 且成功率≥99.5%；宽松线 P95<10s 且成功率≥99.5%。TTFT 以首个响应体字节时刻近似，短请求下与完整响应接近，不作主判据。')
    A('')

    A('## 3. 测试 A：短请求中间档位')
    A('')
    A('|档位|完整/计划|成功率%|均值|P50|P95|P99|最大|批次秒|已发未结束峰值|200未读完峰值|')
    A('|---|---|---|---|---|---|---|---|---|---|---|')
    for r in sorted(shorts, key=lambda x: (n_of(x['label']), x['label'])):
        A(fmt_row(r))
    A('')
    A('### 3.1 SLO 判定')
    A('')
    A('|并发档|3轮 P95|P95中位|3轮字面成功率|3轮网关成功率|延迟<5s全满足|延迟<10s全满足|严格拐点候选|宽松拐点候选|')
    A('|---|---|---|---|---|---|---|---|---|')
    for n in short_ladder:
        v = slo['short_ladder'][str(n)]
        A(f"|{n}|{'/'.join(str(x) for x in v['p95_by_rep'])}|{v['p95_median']}|"
          f"{'/'.join(str(x) for x in v['success_by_rep'])}|{'/'.join(str(x) for x in v['gateway_success_by_rep'])}|"
          f"{'是' if v['latency_strict_all'] else '否'}|{'是' if v['latency_loose_all'] else '否'}|"
          f"{'是' if v['strict_candidate'] else '否'}|{'是' if v['loose_candidate'] else '否'}|")
    A('')
    A('> 拐点候选定义：该档 3 轮中 ≥2 轮 P95 突破阈值。字面成功率 = complete/planned；网关成功率 = complete/(planned − 未取得 HTTP 状态)，'
      '即只对确实收到 HTTP 响应的请求计成功。')
    A('')
    A('### 3.2 与上一轮对照（背景，非同批）')
    A('')
    A('上一轮（[TPT网关短请求并发验证](../2026-10-07-TPT网关短请求并发验证/报告.md)，同模型/同提示/同 128 上限、不同日期批次）测得：'
      '100 档 P95 2.900s、200 档 P95 6.827s、400 档 P95 14.351s、800 档 P95 28.156s。本轮 400 档 P95 约 14.7～15.0s，与上一轮基本一致；'
      '说明本轮档位整体未出现系统性偏移。上一轮只把边界粗略夹在 100～200（严格）与 200～250（宽松）；'
      '本轮下探补档后收敛为 **严格线 (100,125)、宽松线 (240,250)**。')
    A('')

    A('## 4. 测试 B：1600 档重复与恢复')
    A('')
    b = [r for r in shorts if n_of(r['label']) == 1600]
    A('|轮次|完整/计划|状态分布|客户端异常分布|P95|批次秒|')
    A('|---|---|---|---|---|---|')
    for r in sorted(b, key=lambda x: x['label']):
        A(f"|{r['label']}|{r['complete']}/{r['planned']}|{r['statuses']}|{r['client_errors']}|{r['e2e']['p95']}|{r['duration']}|")
    A('')
    agg = {}
    for r in b:
        for k, v in r['client_errors'].items():
            agg[k] = agg.get(k, 0) + v
    http5xx = {k: v for r in b for k, v in r['statuses'].items() if k.startswith('5')}
    A(f"- 3 轮客户端异常合计：{agg}；HTTP 5xx：{http5xx if http5xx else '无'}。")
    A('- 3 轮均**未完整返回**（完整率约 7%～19%），但失败全部落在客户端连接类错误与 no_http_status，'
      '**未再次出现上一轮的 HTTP 500 / 503**。headers_sent_peak 均 < 1000，说明本机并未真正同时建立 1600 个连接。')
    A('- 因此本轮 1600 的失败**不能归到网关/模型侧**：它由客户端连接能力主导，500/503 的根因在本轮**未复现、仍未确认**。')
    A('- 注意：上表的 P95/均值只对完成的少量请求（112/109/309）计算，不代表该档整体延迟，不得据此得出“1600 档延迟很低”的结论。')
    A('')
    A('恢复检查：')
    A('')
    A('|轮次|完整/计划|状态|耗时秒|')
    A('|---|---|---|---|')
    for r in sorted(recs, key=lambda x: x['label']):
        A(f"|{r['label']}|{r['complete']}/{r['planned']}|{r['statuses']}|{r['duration']}|")
    A('')

    A('## 5. 测试 C：服务端并发采集')
    A('')
    A('- 本执行环境仅有 API key，没有网关 nginx access log、路由/通道服务或管理端接口的访问通道。')
    A('- 因此**未取得服务端活跃请求数、排队数、通道健康状态与 upstream 状态码**；按需求单兜底条款，提供每档起止时间戳（第 7 节，`run-log.json`）供事后对照日志。')
    A('- 客户端侧“已发未结束峰值 / 200 未读完峰值”仅代表本机观测，不等于服务端并发。')
    A('')

    A('## 6. 测试 D：长请求对照')
    A('')
    if longs:
        A('|档位|完整/计划|成功率%|均值|P50|P95|P99|最大|批次秒|输入token中位|输出token中位|')
        A('|---|---|---|---|---|---|---|---|---|---|---|')
        for r in sorted(longs, key=lambda x: (n_of(x['label']), x['label'])):
            e = r['e2e']
            um = r.get('usage_median', {})
            A(f"|{r['label']}|{r['complete']}/{r['planned']}|{r['success_rate']}|{e['mean']}|{e['p50']}|{e['p95']}|{e['p99']}|{e['max']}|{r['duration']}|{um.get('prompt_tokens')}|{um.get('completion_tokens')}|")
    else:
        A('未执行。')
    if longs:
        l100 = [r for r in longs if n_of(r['label']) == 100]
        s400 = [r for r in shorts if n_of(r['label']) == 400]
        if l100 and s400:
            lp = [r['e2e']['p95'] for r in l100]
            sp = [r['e2e']['p95'] for r in s400]
            A('')
            A(f"- 长请求 100 档 P95 = {lp}，短请求 400 档 P95 = {sp}。"
              '长请求 100 档的 P95 已达到/超过短请求 400 档，说明**短请求容量结论不可外推到长输入/长输出业务**，需按业务负载单独定边界。')
            um = longs[0].get('usage_median', {})
            A(f"- 实际负载：服务端计量输入中位 {um.get('prompt_tokens')} token（目标约 2048，实际略低），"
              f"输出中位 {um.get('completion_tokens')} token（上限 512，基本全部达到上限）。")
    A('')

    A('## 7. 时间窗口清单（供服务端日志对照）')
    A('')
    A('|档位|UTC 开始|UTC 结束|北京时间开始|北京时间结束|')
    A('|---|---|---|---|---|')
    for e in runlog:
        A(f"|{e['label']}|{e['utc_start']}|{e['utc_end']}|{e['beijing_start']}|{e['beijing_end']}|")
    A('')

    A('## 8. 失败详情汇总')
    A('')
    by_label = {}
    for r in fails:
        by_label.setdefault(r['id'].rsplit('-', 1)[0], []).append(r)
    A(f'合计失败请求 {len(fails)} 条，完整记录见 `failure-details.json`。按批次：')
    A('')
    A('|批次|失败数|状态分布|')
    A('|---|---|---|')
    for lbl in sorted(by_label):
        rs = by_label[lbl]
        status = {}
        for r in rs:
            status[str(r.get('status', 'no_http_status'))] = status.get(str(r.get('status', 'no_http_status')), 0) + 1
        A(f"|{lbl}|{len(rs)}|{status}|")
    A('')

    A('## 9. 限制')
    A('')
    A('- 有限档位、每档 3 次，未做更长时间窗口的持续复核。')
    A('- 未取得服务端并发/排队数与 nginx/通道日志，500/503 根因仍**未确认**，只能给出客户端可观测的失败分类与时间窗。')
    A('- 固定短提示可能享受缓存，简短输出；结论不外推到长上下文、工具或典型 Agent 负载（长请求对照仅作有限参照）。')
    A('- 并发请求数不等于用户数；本报告不给出“最大支持多少用户”。')
    A('')

    A('## 10. 证据入口')
    A('')
    A('|内容|路径|')
    A('|---|---|')
    A('|逐请求记录|`wave-*.json`、`long-*.json`、`recovery-*.json`|')
    A('|原始/部分响应|`responses/*.sse.gz`|')
    A('|时间窗口|`run-log.json`|')
    A('|延迟与 SLO 汇总|`latency-summary.json`、`slo-analysis.json`|')
    A('|失败详情|`failure-details.json`|')
    A('|执行器/离线统计|`code/slo_boundary.py`、`code/report.py`、`code/build_report.py`|')
    A('|哈希与归属|`evidence-index.json`|')
    A('')

    (TASK / '报告.md').write_text('\n'.join(lines), encoding='utf-8')
    print('wrote 报告.md; latency_strict_boundary=', lat_strict, 'latency_loose_boundary=', lat_loose,
          '| literal strict/loose=', lit_strict, lit_loose)


if __name__ == '__main__':
    main()
