#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LLM 标准化性能测试套件 (kit v1.0.0)
====================================
与 2026-09-24 基准测试完全同源: 相同 prompt、相同参数、相同统计口径。
纯标准库, 无需安装任何依赖; 产出结构化 JSON, 供 report.py 合并生成对比报告。

用法:
  python bench.py --target flash-public          # 跑 config.json 里的某个 target
  python bench.py --target intranet --quick      # 快速模式(约1/3样本)
  python bench.py --target intranet --only ttft,sweep   # 只跑指定节
  python bench.py --list                         # 列出所有测试节

结果写入 results/<target>_<时间戳>.json
"""
import argparse
import json
import platform
import ssl
import statistics
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

KIT_VERSION = "1.0.0"
HERE = Path(__file__).resolve().parent

# ---------------- 固定测试 case (不可改, 保证可比性) ----------------
PROMPTS = {
    "short":        "用一句话介绍你自己",
    "ttft":         "写一句问候",
    "think":        "9.11和9.9哪个大？只答数字",
    "throughput":   "写一篇约1500字的散文，主题是秋天",
    "steady":       "请写一篇约3000字的科普文章，主题是量子计算的基础原理，分章节叙述。",
    "conc_short":   "回答：1+1=?",
    "sweep":        "请列举生活中的100个细节观察，每条一行，编号排列。",
}
PROMPTS["prefill_rep"] = (
    "".join(f"编号{i} 这是用于测试长文本输入处理速度的一段内容。" for i in range(2000))
    + "\n\n请只回答：以上文本共有几个段落标记词'编号'？"
)


def fresh_prefill_prompt(seed_offset: int) -> str:
    """每次生成内容唯一的长文本, 排除服务端前缀缓存干扰"""
    seed = int(time.time()) + seed_offset * 7919
    body = "".join(f"第{seed+j}项：这是一段用于测量预填充速度的测试文本，包含若干中文词组。" for j in range(2500))
    return body + "\n\n请只回答：以上文本以哪一项编号开头？"


# ---------------- HTTP 客户端 ----------------
class Client:
    def __init__(self, target, timeout_s=180):
        self.base = target["base_url"].rstrip("/")
        self.key = target.get("api_key") or ""
        self.model = target["model"]
        self.think = target.get("think_level")
        self.supports_think = bool(target.get("supports_think"))
        self.extra = target.get("extra_fields") or {}  # 厂商专有请求字段, 如 deepseek 的 effort
        self.timeout = timeout_s
        self.ctx = ssl.create_default_context()
        self.actual_models = set()  # 响应体里的真实 model id (别名路由时与请求值不同)

    def mkbody(self, **kw):
        b = {"model": self.model, **kw}
        if self.supports_think and self.think and "think_level" not in b:
            b["think_level"] = self.think
        b.update(self.extra)
        return b

    def _post(self, body, timeout=None):
        req = urllib.request.Request(
            self.base + "/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": "Bearer " + self.key},
            method="POST",
        )
        return urllib.request.urlopen(req, timeout=timeout or self.timeout, context=self.ctx)

    def chat(self, body, timeout=None):
        """非流式; 返回 (data, 耗时s)"""
        t0 = time.perf_counter()
        with self._post(body, timeout) as r:
            data = json.loads(r.read().decode("utf-8"))
        if data.get("model"):
            self.actual_models.add(data["model"])
        return data, time.perf_counter() - t0

    def chat_stream(self, body, timeout=None):
        """流式; 返回 (chunk到达时间戳ms列表, 最后一个data对象, 总耗时s)"""
        t0 = time.perf_counter()
        times, last = [], None
        with self._post({**body, "stream": True}, timeout) as r:
            for raw in r:
                line = raw.decode("utf-8", "replace").strip()
                if not line.startswith("data:"):
                    continue
                p = line[5:].strip()
                if p == "[DONE]":
                    break
                times.append((time.perf_counter() - t0) * 1000)
                try:
                    last = json.loads(p)
                    if isinstance(last, dict) and last.get("model"):
                        self.actual_models.add(last["model"])
                except Exception:
                    pass
        return times, last, time.perf_counter() - t0


# ---------------- 统计工具 ----------------
def pct(xs, p):
    xs = sorted(xs)
    if not xs:
        return 0.0
    k = (len(xs) - 1) * p / 100
    f = int(k)
    c = min(f + 1, len(xs) - 1)
    return xs[f] + (xs[c] - xs[f]) * (k - f)


def stats(xs):
    if not xs:
        return {}
    return {k: round(v, 1) for k, v in {
        "mean": statistics.mean(xs), "p50": pct(xs, 50), "p95": pct(xs, 95),
        "min": min(xs), "max": max(xs),
    }.items()}


def log(msg):
    print(msg, flush=True)


# ---------------- 测试节 ----------------
def sec_short_latency(c, s):
    runs, toks = [], []
    for _ in range(s["short_latency_runs"]):
        d, el = c.chat(c.mkbody(messages=[{"role": "user", "content": PROMPTS["short"]}],
                                max_tokens=s["max_tokens"]))
        runs.append(round(el * 1000, 1))
        toks.append(d.get("usage", {}).get("completion_tokens", 0))
        log(f"  {runs[-1]:.0f} ms, out_tokens={toks[-1]}")
    return {"runs_ms": runs, "out_tokens": toks, "stats_ms": stats(runs)}


def sec_ttft(c, s):
    runs = []
    for _ in range(s["ttft_runs"]):
        times, _, total = c.chat_stream(
            c.mkbody(messages=[{"role": "user", "content": PROMPTS["ttft"]}],
                     max_tokens=s["max_tokens"]))
        if not times:
            runs.append({"ttft_ms": None, "total_ms": round(total * 1000, 1), "chunks": 0})
            continue
        runs.append({"ttft_ms": round(times[0], 1), "total_ms": round(total * 1000, 1),
                     "chunks": len(times)})
        log(f"  ttft={times[0]:.0f}ms total={total*1000:.0f}ms chunks={len(times)}")
    ttfts = [r["ttft_ms"] for r in runs if r["ttft_ms"] is not None]
    return {"runs": runs, "stats_ms": stats(ttfts)}


def sec_throughput(c, s):
    runs = []
    for _ in range(s["throughput_runs"]):
        d, el = c.chat(c.mkbody(messages=[{"role": "user", "content": PROMPTS["throughput"]}],
                                max_tokens=s["max_tokens"]))
        ct = d.get("usage", {}).get("completion_tokens", 0)
        runs.append({"total_ms": round(el * 1000, 1), "completion_tokens": ct,
                     "tok_per_s": round(ct / el, 1) if el else 0})
        log(f"  {runs[-1]['total_ms']:.0f}ms tokens={ct} -> {runs[-1]['tok_per_s']} tok/s")
    tps = [r["tok_per_s"] for r in runs if r["tok_per_s"]]
    return {"runs": runs, "mean_tok_per_s": round(statistics.mean(tps), 1) if tps else None}


def sec_prefill(c, s):
    out = {}
    log("  [repeated 31K, 观察缓存]")
    rep = []
    for _ in range(s["prefill_repeated_runs"]):
        try:
            d, el = c.chat(c.mkbody(messages=[{"role": "user", "content": PROMPTS["prefill_rep"]}],
                                    max_tokens=s["max_tokens"]))
            rep.append({"prompt_tokens": d.get("usage", {}).get("prompt_tokens"),
                        "total_ms": round(el * 1000, 1)})
            log(f"    prompt_tokens={rep[-1]['prompt_tokens']} total={rep[-1]['total_ms']:.0f}ms")
        except Exception as e:
            rep.append({"error": str(e)})
            log(f"    error: {e}")
    out["repeated"] = rep
    log("  [fresh 60K, 排除缓存]")
    fresh = []
    for i in range(s["prefill_fresh_runs"]):
        try:
            d, el = c.chat(c.mkbody(messages=[{"role": "user", "content": fresh_prefill_prompt(i)}],
                                    max_tokens=s["max_tokens"]))
            ans = (d["choices"][0]["message"].get("content") or "")[:40]
            fresh.append({"prompt_tokens": d.get("usage", {}).get("prompt_tokens"),
                          "total_ms": round(el * 1000, 1), "answer_head": ans})
            log(f"    prompt_tokens={fresh[-1]['prompt_tokens']} total={fresh[-1]['total_ms']:.0f}ms")
        except Exception as e:
            fresh.append({"error": str(e)})
            log(f"    error: {e}")
    out["fresh"] = fresh
    ok = [r["total_ms"] for r in fresh if "total_ms" in r]
    out["fresh_mean_ms"] = round(statistics.mean(ok), 1) if ok else None
    return out


def sec_concurrency_short(c, s):
    n = s["concurrency_short_n"]

    def one(_):
        try:
            _, el = c.chat(c.mkbody(messages=[{"role": "user", "content": PROMPTS["conc_short"]}],
                                    max_tokens=s["max_tokens"]))
            return round(el * 1000, 1), None
        except Exception as e:
            return None, str(e)

    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=n) as ex:
        outs = list(ex.map(one, range(n)))
    wall = round((time.perf_counter() - t0) * 1000, 1)
    oks = [l for l, e in outs if l is not None]
    errs = [e for _, e in outs if e]
    log(f"  wall={wall:.0f}ms ok={len(oks)}/{n} err={len(errs)}")
    return {"n": n, "wall_ms": wall, "ok": len(oks), "err": len(errs),
            "lat_ms": oks, "mean_ms": round(statistics.mean(oks), 1) if oks else None,
            "p95_ms": round(pct(oks, 95), 1) if oks else None, "errors": errs[:5]}


def sec_think_levels(c, s):
    if not c.supports_think:
        return {"skipped": "target 不支持 think_level"}
    out = {}
    for lv in s["think_levels"]:
        xs, cts = [], []
        for _ in range(s["think_runs_each"]):
            try:
                d, el = c.chat(c.mkbody(messages=[{"role": "user", "content": PROMPTS["think"]}],
                                        max_tokens=s["max_tokens"], think_level=lv))
                xs.append(round(el * 1000, 1))
                cts.append(d.get("usage", {}).get("completion_tokens", 0))
            except Exception as e:
                log(f"  {lv} error: {e}")
        if xs:
            out[lv] = {"mean_ms": round(statistics.mean(xs), 1),
                       "mean_out_tokens": round(statistics.mean(cts), 1), "runs_ms": xs}
            log(f"  {lv}: mean={out[lv]['mean_ms']}ms out_tokens={out[lv]['mean_out_tokens']}")
    return out


def _mid_rate(times):
    """流式中段 10%~90% 的 chunk/s (剔除 TTFT 与收尾缓冲)"""
    n = len(times)
    if n < 20:
        return None
    i10, i90 = int(n * 0.1), int(n * 0.9)
    span = (times[i90] - times[i10]) / 1000
    return round((i90 - i10) / span, 1) if span > 0 else None


def sec_steady_decode(c, s):
    runs = []
    for _ in range(s["steady_decode_runs"]):
        times, last, _ = c.chat_stream(
            c.mkbody(messages=[{"role": "user", "content": PROMPTS["steady"]}],
                     max_tokens=s["steady_decode_max_tokens"]), timeout=300)
        rate = _mid_rate(times)
        ct = ((last or {}).get("usage") or {}).get("completion_tokens")
        runs.append({"chunks": len(times), "mid_chunk_per_s": rate, "completion_tokens": ct})
        log(f"  chunks={len(times)} steady={rate} chunk/s tokens={ct}")
    rates = [r["mid_chunk_per_s"] for r in runs if r["mid_chunk_per_s"]]
    return {"runs": runs, "mean_chunk_per_s": round(statistics.mean(rates), 1) if rates else None}


def sec_nonstream_long(c, s):
    runs = []
    for _ in range(s["nonstream_long_runs"]):
        d, el = c.chat(c.mkbody(messages=[{"role": "user", "content": PROMPTS["steady"]}],
                                max_tokens=s["steady_decode_max_tokens"]), timeout=300)
        ct = d.get("usage", {}).get("completion_tokens", 0)
        runs.append({"total_ms": round(el * 1000, 1), "completion_tokens": ct,
                     "tok_per_s": round(ct / el, 1) if el else 0})
        log(f"  {runs[-1]['total_ms']:.0f}ms tokens={ct} -> {runs[-1]['tok_per_s']} tok/s")
    tps = [r["tok_per_s"] for r in runs if r["tok_per_s"]]
    return {"runs": runs, "mean_tok_per_s": round(statistics.mean(tps), 1) if tps else None}


def sec_stream_timing(c, s):
    """短回答是否攒批 + 长回答是否真增量"""
    out = {"short": [], "long": []}
    for _ in range(s["stream_timing_short_runs"]):
        times, _, _ = c.chat_stream(
            c.mkbody(messages=[{"role": "user", "content": PROMPTS["ttft"]}],
                     max_tokens=s["max_tokens"]))
        if times:
            r = {"chunks": len(times), "first_ms": round(times[0], 1),
                 "last_ms": round(times[-1], 1), "span_ms": round(times[-1] - times[0], 1)}
            out["short"].append(r)
            log(f"  short: chunks={r['chunks']} first={r['first_ms']:.0f}ms span={r['span_ms']:.0f}ms")
    for _ in range(s["stream_timing_long_runs"]):
        times, _, _ = c.chat_stream(
            c.mkbody(messages=[{"role": "user", "content": PROMPTS["throughput"]}],
                     max_tokens=s["max_tokens"]), timeout=300)
        if times:
            span = (times[-1] - times[0]) / 1000
            r = {"chunks": len(times), "first_ms": round(times[0], 1),
                 "span_ms": round((times[-1] - times[0]), 1),
                 "chunk_per_s": round(len(times) / span, 1) if span > 0 else None}
            out["long"].append(r)
            log(f"  long: chunks={r['chunks']} first={r['first_ms']:.0f}ms rate={r['chunk_per_s']}/s")
    return out


def sec_sweep(c, s):
    """并发阶梯: 聚合吞吐 + 延迟膨胀 (每请求固定 sweep_max_tokens)"""
    out = {}
    for n in s["sweep"]:
        def one(_):
            t0 = time.perf_counter()
            try:
                d, _el = c.chat(c.mkbody(messages=[{"role": "user", "content": PROMPTS["sweep"]}],
                                         max_tokens=s["sweep_max_tokens"]), timeout=300)
                return round(time.perf_counter() - t0, 3), d.get("usage", {}).get("completion_tokens", 0), None
            except Exception as e:
                return None, 0, str(e)

        t0 = time.perf_counter()
        with ThreadPoolExecutor(max_workers=n) as ex:
            outs = list(ex.map(one, range(n)))
        wall = time.perf_counter() - t0
        oks = [(el, tk) for el, tk, err in outs if err is None]
        errs = [err for _, _, err in outs if err]
        total_tokens = sum(tk for _, tk in oks)
        agg = round(total_tokens / wall, 1) if wall else 0
        lats = [round(el * 1000, 1) for el, _ in oks]
        out[str(n)] = {"wall_ms": round(wall * 1000, 1), "ok": len(oks), "err": len(errs),
                       "total_tokens": total_tokens, "agg_tok_per_s": agg,
                       "mean_lat_ms": round(statistics.mean(lats), 1) if lats else None,
                       "errors": errs[:3]}
        log(f"  N={n:3d}: wall={wall*1000:.0f}ms ok={len(oks)}/{n} tokens={total_tokens} "
            f"agg={agg} tok/s mean_lat={out[str(n)]['mean_lat_ms']}ms"
            + (f" errs={len(errs)}" if errs else ""))
    return out


SECTIONS = {
    "short_latency":    ("短请求非流式延迟 (10次)", sec_short_latency),
    "ttft":             ("流式首字延迟 TTFT (10次)", sec_ttft),
    "throughput":       ("输出吞吐 1500字 (3次)", sec_throughput),
    "prefill":          ("长文本预填充 31K重复+60K全新", sec_prefill),
    "concurrency_short": ("并发x10 短请求", sec_concurrency_short),
    "think_levels":     ("思考档位对比", sec_think_levels),
    "steady_decode":    ("稳态解码速率 (流式中段)", sec_steady_decode),
    "nonstream_long":   ("非流式长输出 tok/s", sec_nonstream_long),
    "stream_timing":    ("流式逐chunk节奏", sec_stream_timing),
    "sweep":            ("并发扫描 N=1..100", sec_sweep),
}
QUICK_OVERRIDES = {
    "short_latency_runs": 3, "ttft_runs": 3, "throughput_runs": 1,
    "prefill_repeated_runs": 1, "prefill_fresh_runs": 1,
    "think_runs_each": 1, "steady_decode_runs": 1, "nonstream_long_runs": 1,
    "stream_timing_short_runs": 1, "stream_timing_long_runs": 0,
    "sweep": [1, 10, 50],
}


def mask_key(k):
    if not k or len(k) < 12:
        return "***"
    return k[:8] + "..." + k[-4:]


def main():
    ap = argparse.ArgumentParser(description="LLM 标准化性能测试套件")
    ap.add_argument("--target", help="config.json 中的 target name")
    ap.add_argument("--config", default=str(HERE / "config.json"))
    ap.add_argument("--out", default=str(HERE / "results"))
    ap.add_argument("--only", help="只跑指定节, 逗号分隔 (见 --list)")
    ap.add_argument("--quick", action="store_true", help="快速模式, 样本量减至约1/3")
    ap.add_argument("--list", action="store_true", help="列出所有测试节")
    args = ap.parse_args()

    if args.list:
        for k, (desc, _) in SECTIONS.items():
            print(f"  {k:20s} {desc}")
        return

    cfg = json.loads(Path(args.config).read_text(encoding="utf-8"))
    target = next((t for t in cfg["targets"] if t["name"] == args.target), None)
    if target is None:
        names = ", ".join(t["name"] for t in cfg["targets"])
        sys.exit(f"target '{args.target}' 不存在, 可选: {names}")

    suite = dict(cfg["suite"])
    if args.quick:
        suite.update(QUICK_OVERRIDES)

    only = [x.strip() for x in args.only.split(",")] if args.only else list(SECTIONS)
    unknown = [x for x in only if x not in SECTIONS]
    if unknown:
        sys.exit(f"未知测试节: {unknown}, 用 --list 查看")

    c = Client(target, timeout_s=suite["timeout_s"])
    started = datetime.now(timezone.utc)
    t_start = time.perf_counter()
    results = {}
    errors = {}

    print(f"== target={target['name']} ({target['display_name']}) model={target['model']} "
          f"quick={args.quick} ==")
    for key in only:
        desc, fn = SECTIONS[key]
        print(f"\n== {key}: {desc} ==")
        t0 = time.perf_counter()
        try:
            results[key] = fn(c, suite)
        except Exception as e:
            errors[key] = f"{type(e).__name__}: {e}"
            results[key] = {"error": errors[key]}
            print(f"  SECTION ERROR: {errors[key]}")
        print(f"  ({time.perf_counter()-t0:.1f}s)")

    doc = {
        "meta": {
            "kit_version": KIT_VERSION,
            "target": {k: target.get(k) for k in
                       ("name", "display_name", "base_url", "model", "think_level",
                        "extra_fields")},
            "model_actual": sorted(c.actual_models) or None,
            "alias_note": ("请求 model 与响应 model 不一致(别名路由)"
                           if c.actual_models and target["model"] not in c.actual_models
                           else None),
            "api_key_masked": mask_key(target.get("api_key", "")),
            "started_utc": started.isoformat(timespec="seconds"),
            "duration_s": round(time.perf_counter() - t_start, 1),
            "quick": args.quick,
            "suite": suite,
            "host": {"platform": platform.platform(), "python": sys.version.split()[0]},
            "section_errors": errors,
        },
        "results": results,
    }
    outdir = Path(args.out)
    outdir.mkdir(parents=True, exist_ok=True)
    stamp = started.strftime("%Y%m%d-%H%M%S")
    outfile = outdir / f"{target['name']}_{stamp}.json"
    outfile.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n== DONE in {doc['meta']['duration_s']}s -> {outfile}")
    if errors:
        print(f"    有测试节出错: {list(errors)}")


if __name__ == "__main__":
    main()
