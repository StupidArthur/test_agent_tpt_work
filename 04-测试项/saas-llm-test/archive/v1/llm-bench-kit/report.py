#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
对比报告生成器 (kit v1.0.0)
============================
读取一个或多个 bench.py 产出的结果 JSON, 生成 Markdown 对比报告。
2 个文件 = 两方对比; 3 个文件 = 三方对比 (列顺序 = 命令行文件顺序)。

用法:
  python report.py results/a.json results/b.json results/c.json -o report-3way.md
  python report.py results/*.json -o report.md --reference intranet

纯标准库, 离线运行, 不发起任何网络请求。
"""
import argparse
import json
import statistics
from datetime import datetime
from pathlib import Path

KIT_VERSION = "1.0.0"

APPENDIX_ORDER = ["short_latency", "ttft", "throughput", "prefill", "concurrency_short",
                  "think_levels", "steady_decode", "nonstream_long", "stream_timing", "sweep"]

METHODS = {
    "short_latency": "非流式请求, 固定 prompt『用一句话介绍你自己』, max_tokens=4000; "
                     "perf_counter 计『发出请求→完整 JSON 返回』耗时(含 RTT/排队/解码); "
                     "每 target 连续 10 次, 统计 mean/p50/p95/min/max。",
    "ttft": "流式请求(固定 prompt『写一句问候』), 逐行读 SSE, 首条 data: 行的到达时间戳即 TTFT; "
            "每 target 10 次, 统计均值分位。",
    "throughput": "非流式 1500 字级长回答(『写一篇约1500字的散文，主题是秋天』); "
                  "tok/s = usage.completion_tokens ÷ 端到端耗时(含首字延迟); 3 次取均值。",
    "prefill": "两组: ①重复组—固定 31K tokens 文本连发, 第 2/3 次观察前缀缓存; "
               "②全新组—以 time.time() 为种子生成内容唯一文本(排除缓存), "
               "以 usage.prompt_tokens 确认长度, 输出极短使耗时几乎全为预填充; 每组 3 次。",
    "concurrency_short": "ThreadPoolExecutor 同时发 10 个短请求(『回答：1+1=?』), "
                          "记录墙钟、成功率、单请求延迟分位。",
    "think_levels": "固定问题(『9.11和9.9哪个大？只答数字』), 对支持 think_level 的 target "
                     "依次以 off/low/medium/high 各发 3 次, 比较延迟与输出 token 数; "
                     "不支持的 target 标记 skipped。",
    "steady_decode": "流式 3000 字级长输出, 取时间戳序列中间 10%~90% 区间计算 chunk/s —— "
                      "剔除 TTFT/预填充(前10%)与收尾缓冲(后10%), 得到纯解码阶段速率; 3 次取均值。"
                      "这是与并发无关的『模型吐字速度』口径。",
    "nonstream_long": "同一 3000 字 prompt 非流式, tok/s = completion_tokens ÷ 总耗时; 与 steady_decode 交叉验证。",
    "stream_timing": "逐 chunk 记录到达时间戳: 短回答看首尾时间差 span(span≤50ms 判定为攒批/假增量), "
                     "长回答看中段均匀速率(是否真增量)。",
    "sweep": "阶梯并发 N∈{1,5,10,20,50,100}, 每请求固定生成 800 tokens"
             "(『请列举生活中的100个细节观察…』), 单波突发(single burst): "
             "聚合吞吐 = Σcompletion_tokens ÷ 墙钟; 同时记单请求均延迟与错误数。"
             "饱和判定: 相邻两档吞吐增幅<10% 且延迟增幅>20% → 记为饱和点。"
             "有效并行路数 = 聚合吞吐上限 ÷ steady_decode 单流速率(工程近似)。",
}


# ---------------- 读取与取值 ----------------
def pick(d, *path):
    cur = d.get("results")
    for k in path:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(k)
    return cur


def col(d):
    t = d["meta"]["target"]
    return t.get("display_name") or t.get("name")


def fmt(v, suffix=""):
    if v is None:
        return "—"
    if isinstance(v, float):
        return (f"{v:.0f}{suffix}" if abs(v) >= 100 else f"{v:.1f}{suffix}")
    return f"{v}{suffix}"


def table(headers, rows):
    out = ["| " + " | ".join(headers) + " |",
           "|" + "|".join(["---"] * len(headers)) + "|"]
    for r in rows:
        out.append("| " + " | ".join(str(x) for x in r) + " |")
    return "\n".join(out) + "\n"


def gap_line(vals):
    """vals: [(name, value_or_None)]; 返回 (best, best_v, worst, worst_v, ratio)"""
    nums = [(n, v) for n, v in vals if isinstance(v, (int, float)) and v > 0]
    if len(nums) < 2:
        return None
    lo = min(nums, key=lambda x: x[1])
    hi = max(nums, key=lambda x: x[1])
    return lo[0], lo[1], hi[0], hi[1], round(hi[1] / lo[1], 1)


def sweep_max_agg(d):
    sw = pick(d, "sweep")
    if not isinstance(sw, dict):
        return None
    vals = [v.get("agg_tok_per_s") for v in sw.values() if isinstance(v, dict)]
    vals = [v for v in vals if isinstance(v, (int, float))]
    return max(vals) if vals else None


def repeated_records(d):
    rep = pick(d, "prefill", "repeated")
    if not isinstance(rep, list):
        return []
    return [r for r in rep if isinstance(r, dict) and r.get("total_ms") is not None]


def fresh_records(d):
    fr = pick(d, "prefill", "fresh")
    if not isinstance(fr, list):
        return []
    return [r for r in fr if isinstance(r, dict) and r.get("total_ms") is not None]


def err_total(d):
    n = 0
    cs = pick(d, "concurrency_short")
    if isinstance(cs, dict) and isinstance(cs.get("err"), int):
        n += cs["err"]
    sw = pick(d, "sweep")
    if isinstance(sw, dict):
        for v in sw.values():
            if isinstance(v, dict) and isinstance(v.get("err"), int):
                n += v["err"]
    return n


def saturation_point(d):
    """返回 'N=xx' 或 None(未饱和)"""
    sw = pick(d, "sweep")
    if not isinstance(sw, dict) or len(sw) < 3:
        return None
    ns = sorted(sw, key=lambda x: int(x))
    for a, b in zip(ns, ns[1:]):
        ga = sw[a].get("agg_tok_per_s") or 0
        gb = sw[b].get("agg_tok_per_s") or 0
        la = sw[a].get("mean_lat_ms") or 0
        lb = sw[b].get("mean_lat_ms") or 0
        if ga > 0 and (gb - ga) / ga < 0.10 and la > 0 and (lb - la) / la > 0.20:
            return f"N={b}"
    return None


def effective_parallel(d):
    sd = pick(d, "steady_decode", "mean_chunk_per_s")
    mx = sweep_max_agg(d)
    if isinstance(sd, (int, float)) and sd > 0 and mx:
        return round(mx / sd)
    return None


def build(docs, reference=None):
    if reference:
        ref = next((d for d in docs if d["meta"]["target"]["name"] == reference), None)
        if ref:
            docs = [ref] + [d for d in docs if d is not ref]
    names = [col(d) for d in docs]
    L = []

    L.append("# LLM 性能对比报告\n")
    L.append(f"**生成时间**：{datetime.now().strftime('%Y-%m-%d %H:%M')}  ")
    L.append(f"**套件版本**：kit {KIT_VERSION}（同 prompt / 同参数 / 同统计口径，结果可直接横比）  ")
    L.append(f"**对比对象**：{' vs '.join(names)}\n")

    # ---- 0. 测试对象 ----
    L.append("## 0. 测试对象\n")
    rows = []
    for d in docs:
        m, t = d["meta"], d["meta"]["target"]
        model_cell = t.get("model", "—")
        actual = m.get("model_actual")
        if actual and t.get("model") not in actual:
            model_cell = f"{model_cell} → `{','.join(actual)}`"
        rows.append([f"**{col(d)}**", model_cell, f"`{t.get('base_url', '—')}`",
                     t.get("think_level") or "—", m.get("started_utc", "—"),
                     f"{m.get('duration_s', '—')}s", m.get("api_key_masked", "—")])
    L.append(table(["对象", "model", "endpoint", "think_level", "开始时间(UTC)", "总耗时", "key"], rows))

    suites = {json.dumps(d["meta"].get("suite", {}), sort_keys=True) for d in docs}
    if len(suites) == 1:
        L.append("> ✅ 各对象运行参数完全一致（suite 相同），结果可直接横比。\n")
    else:
        L.append("> ⚠️ **各对象 suite 参数不一致**（可能使用了 --quick 或改过 config），对应数值不完全可比。\n")
    quicked = [names[i] for i, d in enumerate(docs) if d["meta"].get("quick")]
    if quicked:
        L.append(f"> ⚠️ quick 模式运行的对象: {'、'.join(quicked)}\n")

    # ---- 1. 延迟 ----
    L.append("## 1. 延迟\n")
    rows = []
    for label, path in [("短请求均值 (ms)", ("short_latency", "stats_ms", "mean")),
                        ("短请求 p50 (ms)", ("short_latency", "stats_ms", "p50")),
                        ("短请求 p95 (ms)", ("short_latency", "stats_ms", "p95")),
                        ("**TTFT 均值 (ms)**", ("ttft", "stats_ms", "mean")),
                        ("TTFT p50 (ms)", ("ttft", "stats_ms", "p50")),
                        ("TTFT p95 (ms)", ("ttft", "stats_ms", "p95"))]:
        rows.append([label] + [fmt(pick(d, *path)) for d in docs])
    L.append(table(["指标"] + names, rows))
    g = gap_line([(col(d), pick(d, "ttft", "stats_ms", "mean")) for d in docs])
    if g:
        L.append(f"**TTFT 差距**：{g[2]} / {g[0]} = **{g[4]}×**（{fmt(g[3])}ms vs {fmt(g[1])}ms）\n")

    # ---- 2. 吞吐 ----
    L.append("## 2. 吞吐\n")
    L.append(table(["指标"] + names, [
        ["稳态解码 (chunk/s)"] + [fmt(pick(d, "steady_decode", "mean_chunk_per_s")) for d in docs],
        ["非流式长输出 (tok/s)"] + [fmt(pick(d, "nonstream_long", "mean_tok_per_s")) for d in docs],
        ["1500字端到端 (tok/s)"] + [fmt(pick(d, "throughput", "mean_tok_per_s")) for d in docs],
    ]))
    g = gap_line([(col(d), pick(d, "steady_decode", "mean_chunk_per_s")) for d in docs])
    if g:
        L.append(f"**单流解码差距**：{g[2]} / {g[0]} = **{g[4]}×**（{fmt(g[3])} vs {fmt(g[1])} chunk/s）\n")

    # ---- 3. 长文本 ----
    L.append("## 3. 长文本预填充\n")
    rows = [["全新 60K 均值 (ms)"] + [fmt(pick(d, "prefill", "fresh_mean_ms")) for d in docs]]
    rows.append(["全新文本 prompt_tokens"] + [
        fmt(fresh_records(d)[0].get("prompt_tokens")) if fresh_records(d) else "—" for d in docs])
    rows.append(["重复31K 首次 (ms)"] + [
        fmt(repeated_records(d)[0].get("total_ms")) if repeated_records(d) else "—" for d in docs])
    rows.append(["重复31K 缓存命中 (ms)"] + [
        fmt(round(statistics.mean([r["total_ms"] for r in repeated_records(d)[1:]]), 1))
        if len(repeated_records(d)) > 1 else "—" for d in docs])
    L.append(table(["指标"] + names, rows))
    g = gap_line([(col(d), pick(d, "prefill", "fresh_mean_ms")) for d in docs])
    if g:
        L.append(f"**冷预填充差距**：{g[2]} / {g[0]} = **{g[4]}×**（{fmt(g[3])}ms vs {fmt(g[1])}ms；"
                 f"缓存命中后差距见上表末行）\n")

    # ---- 4. 并发扫描 ----
    L.append("## 4. 并发扫描（每请求 800 tokens）\n")
    all_ns = sorted({int(n) for d in docs
                     for n in (pick(d, "sweep") or {}) if str(n).isdigit()})
    rows = []
    for n in all_ns:
        row = [f"N={n}"]
        for d in docs:
            s = pick(d, "sweep", str(n))
            if isinstance(s, dict):
                row.append(f"{s.get('agg_tok_per_s', '—')} tok/s / {fmt(s.get('mean_lat_ms'))}ms "
                           f"({s.get('ok')}✓ {s.get('err')}✗)")
            else:
                row.append("—")
        rows.append(row)
    L.append(table(["并发"] + [f"{n}" for n in names], rows))
    L.append("> 单元格 = 聚合吞吐 / 单请求均延迟 (成功✓ 失败✗)\n")

    # ---- 5. 容量分析 ----
    L.append("## 5. 容量与退化分析\n")
    rows = []
    for d in docs:
        sw = pick(d, "sweep")
        first_last = "—"
        if isinstance(sw, dict) and len(sw) >= 2:
            ns = sorted(sw, key=lambda x: int(x))
            a, b = sw[ns[0]].get("mean_lat_ms"), sw[ns[-1]].get("mean_lat_ms")
            if a and b:
                first_last = f"×{round(b / a, 1)}"
        ep = effective_parallel(d)
        rows.append([col(d), f"**{fmt(sweep_max_agg(d))}** tok/s", first_last,
                     saturation_point(d) or "未饱和",
                     f"~{fmt(ep)}" if ep is not None else "—",
                     str(err_total(d))])
    L.append(table(["对象", "聚合吞吐上限", "延迟膨胀(首档→末档)", "饱和点", "有效并行路数", "总错误数"], rows))
    L.append("> 有效并行路数 = 聚合吞吐上限 ÷ 稳态单流速率（工程近似，非服务端实测副本数）\n")

    # ---- 6. 流式行为 ----
    L.append("## 6. 流式行为\n")
    rows = []
    for d in docs:
        st = pick(d, "stream_timing")
        shorts = st.get("short") if isinstance(st, dict) else None
        longs = st.get("long") if isinstance(st, dict) else None
        span = min([r["span_ms"] for r in (shorts or []) if r.get("span_ms") is not None],
                   default=None)
        verdict = ("—" if span is None else
                   ("攒批(假增量)" if span <= 50 else "真增量"))
        rate = None
        if longs:
            rates = [r.get("chunk_per_s") for r in longs if r.get("chunk_per_s")]
            rate = round(statistics.mean(rates), 1) if rates else None
        rows.append([col(d), f"{fmt(span)}ms → {verdict}", fmt(rate, "/s")])
    L.append(table(["对象", "短回答(首尾span/判定)", "长回答增量速率"], rows))

    # ---- 7. 思考档位 ----
    tl_docs = [d for d in docs if isinstance(pick(d, "think_levels"), dict)
               and "skipped" not in (pick(d, "think_levels") or {})]
    if tl_docs:
        L.append("## 7. 思考档位开销\n")
        rows = []
        for lv in ["off", "low", "medium", "high"]:
            row, present = [lv], False
            for d in tl_docs:
                v = pick(d, "think_levels", lv)
                if isinstance(v, dict):
                    row.append(f"{fmt(v.get('mean_ms'))}ms / {fmt(v.get('mean_out_tokens'))}tok")
                    present = True
                else:
                    row.append("—")
            if present:
                rows.append(row)
        L.append(table(["档位"] + [col(d) for d in tl_docs], rows))
        L.append("> 单元格 = 均值延迟 / 平均输出 tokens\n")

    # ---- 8. 差距判定 ----
    L.append("## 8. 差距判定汇总\n")
    gap_rows = []

    def add(metric, getter, higher_better=False):
        vals = [(col(d), getter(d)) for d in docs]
        gn = gap_line(vals)
        if not gn:
            return
        best_n, best_v, worst_n, worst_v, ratio = gn
        # gap_line 按数值大小返回, higher_better 时优劣标签反转 (ratio 始终为 数值大/数值小 ≥1)
        if higher_better:
            best_n, best_v, worst_n, worst_v = worst_n, worst_v, best_n, best_v
        r = ratio
        sev = ("🔴 明显差距" if r >= 3 else
               ("🟠 中等差距" if r >= 1.5 else "✅ 基本相当"))
        gap_rows.append([metric, f"{fmt(best_v)}（{best_n}）",
                         f"{fmt(worst_v)}（{worst_n}）", f"**{r}×**", sev])

    add("流式首字延迟 TTFT (ms, 越低越好)", lambda d: pick(d, "ttft", "stats_ms", "mean"))
    add("单发短请求延迟 (ms, 越低越好)", lambda d: pick(d, "short_latency", "stats_ms", "mean"))
    add("稳态解码 (chunk/s, 越高越好)", lambda d: pick(d, "steady_decode", "mean_chunk_per_s"), True)
    add("冷预填充 60K (ms, 越低越好)", lambda d: pick(d, "prefill", "fresh_mean_ms"))
    add("聚合吞吐上限 (tok/s, 越高越好)", sweep_max_agg, True)
    add("并发末档延迟 (ms, 越低越好)",
        lambda d: (lambda sw: (sw[sorted(sw, key=lambda x: int(x))[-1]].get("mean_lat_ms")
                               if isinstance(sw, dict) and sw else None))(pick(d, "sweep")))
    L.append(table(["指标", "最优", "最差", "差距", "判定"], gap_rows))
    L.append("> 判定阈值：≥3× 🔴 明显差距，1.5~3× 🟠 中等差距，<1.5× ✅ 基本相当\n")

    # ---- 附录 A: 方法 ----
    L.append("---\n\n## 附录 A：测试方法\n")
    for i, key in enumerate(APPENDIX_ORDER, 1):
        title = METHODS[key].split("(")[0][:20]
        L.append(f"### A{i}. `{key}`\n")
        L.append(METHODS[key] + "\n")

    # ---- 附录 B: 证据 ----
    L.append("---\n\n## 附录 B：原始证据（逐次运行数据，节选前 4000 字符）\n")
    for d in docs:
        L.append(f"### {col(d)}\n")
        m = d["meta"]
        L.append(f"- 文件: `{d['_file']}`  ")
        L.append(f"- endpoint: `{m['target'].get('base_url')}` / model `{m['target'].get('model')}`  ")
        L.append(f"- kit {m.get('kit_version')}, started {m.get('started_utc')}, "
                 f"quick={m.get('quick')}, host={m.get('host', {}).get('platform')}, "
                 f"key={m.get('api_key_masked')}\n")
        for key in APPENDIX_ORDER:
            r = pick(d, key)
            if not isinstance(r, dict):
                continue
            L.append(f"**{key}**\n")
            L.append("```json")
            L.append(json.dumps(r, ensure_ascii=False, indent=2)[:4000])
            L.append("```\n")
        errs = m.get("section_errors") or {}
        if errs:
            L.append(f"> ⚠️ section_errors: `{json.dumps(errs, ensure_ascii=False)}`\n")

    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser(description="生成多对象对比报告")
    ap.add_argument("files", nargs="+", help="bench.py 产出的结果 JSON (2~N 个)")
    ap.add_argument("-o", "--out", default="report.md", help="输出 markdown 文件")
    ap.add_argument("--reference", help="以某个 target name 作为第一列基准")
    args = ap.parse_args()
    docs = []
    for p in args.files:
        d = json.loads(Path(p).read_text(encoding="utf-8"))
        d["_file"] = str(p)
        docs.append(d)
    md = build(docs, reference=args.reference)
    Path(args.out).write_text(md, encoding="utf-8")
    print(f"generated: {args.out} ({len(docs)} targets: {', '.join(col(d) for d in docs)})")


if __name__ == "__main__":
    main()
