"""todo_1 复核探针（T03–T09）。复用 llm_probe，不发软件 UI 操作。

用法（任务目录下）：
  set TPT_API_KEY=...
  python code/todo1_recheck.py T03 T04 T05 T06 T07 T08 T09
"""
from __future__ import annotations

import base64
import json
import os
import struct
import sys
import time
import zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from llm_probe.evidence import EvidenceStore, sha256_file  # noqa: E402
from llm_probe.protocol import (CHECK_MARK, add_numbers_tool, normalize, responses_body)  # noqa: E402
from llm_probe.transport import http_json, http_request  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://tpt.supcon.com/tpt-work-router/v1"
KEY = os.environ.get("TPT_API_KEY", "")
STORE = EvidenceStore(os.path.join(ROOT, "补测", "todo_1", "证据"),
                      index_path=os.path.join(ROOT, "补测", "todo_1", "证据索引.jsonl"))
COUNTER = {"n": 0}


def H(stream=False):
    h = {"Content-Type": "application/json",
         "Accept": "text/event-stream" if stream else "application/json"}
    if KEY:
        h["Authorization"] = f"Bearer {KEY}"
    return h


def call(path, body, *, stream=False, model_tag="", cid="", effort=None, idle=60, total=180,
         cancel_after=None):
    COUNTER["n"] += 1
    cancel = None
    if cancel_after is not None:
        t0 = time.monotonic()
        cancel = lambda: (time.monotonic() - t0) > cancel_after
    r = http_request(BASE + path, method="POST", headers=H(stream), body=json.dumps(body).encode(),
                     connect_timeout=10, idle_timeout=idle, total_timeout=total, stream=stream,
                     cancel_check=cancel)
    return r


def resp_usage(obj):
    return (obj or {}).get("usage")


def output_items(obj):
    return (obj or {}).get("output") or []


def visible_text(obj):
    out = []
    for it in output_items(obj):
        if it.get("type") == "message":
            for c in it.get("content") or []:
                if c.get("type") == "output_text":
                    out.append(c.get("text", ""))
    return "".join(out)


def reasoning_text(obj):
    out = []
    for it in output_items(obj):
        if it.get("type") == "reasoning":
            for c in it.get("content") or []:
                if c.get("type") == "reasoning_text":
                    out.append(c.get("text", ""))
    return "".join(out)


# ---------------------------------------------------------------- T03

def T03():
    recs = []
    for label, wire in [("off", None), ("low", "low"), ("high", "high")]:
        for s in range(2):
            body = responses_body("flash", text="只输出 OK", instructions="只输出用户要求的内容",
                                  stream=False, max_output_tokens=256, reasoning_effort=wire)
            r = call("/responses", body, cid=f"T03/{label}/{s}")
            obj = None
            try:
                obj = json.loads(r.body_text)
            except Exception:
                pass
            u = resp_usage(obj) or {}
            rec = {"effort": label, "sample": s, "http": r.http_status,
                   "status": (obj or {}).get("status"),
                   "usage": u,
                   "reasoning_tokens_present": "reasoning_tokens" in ((u or {}).get("output_tokens_details") or {}),
                   "reasoning_tokens": ((u or {}).get("output_tokens_details") or {}).get("reasoning_tokens"),
                   "output_tokens": u.get("output_tokens"),
                   "visible_text": visible_text(obj),
                   "visible_len": len(visible_text(obj)),
                   "reasoning_len": len(reasoning_text(obj)),
                   "reasoning_sha": __import__("hashlib").sha256(reasoning_text(obj).encode()).hexdigest()[:16]}
            recs.append(rec)
    STORE.write_json("T03/metering.json", recs, instances=["DIFF-01"], kind="T03_metering")
    ok = all(x["http"] == 200 for x in recs)
    print("T03 metering:", "OK" if ok else "PARTIAL")
    for x in recs:
        print(f"  {x['effort']}#{x['sample']} status={x['status']} out={x['output_tokens']} "
              f"reas_tok={x['reasoning_tokens']} vis={x['visible_text']!r} reas_len={x['reasoning_len']}")
    return recs


# ---------------------------------------------------------------- T04

def T04():
    snaps = []
    for i in range(2):
        r = http_json(BASE + "/models", headers=H())
        obj = None
        try:
            obj = json.loads(r.body_text)
        except Exception:
            pass
        data = (obj or {}).get("data") if isinstance(obj, dict) else obj
        STORE.write_json(f"T04/catalog_{i}.json", {"http": r.http_status, "body": r.body_text[:6000]},
                         instances=["DIFF-02", "TPT-02"], kind="T04_catalog")
        snaps.append(data)
    models = snaps[-1] or []
    fields = {}
    for m in models:
        for k, v in m.items():
            fields.setdefault(k, set()).add(type(v).__name__)
    defaults = [m.get("id") for m in models if m.get("is_default") is True]
    # 目录稳定性
    stable = json.dumps(snaps[0], sort_keys=True) == json.dumps(snaps[1], sort_keys=True)
    summary = {"count": len(models),
               "ids": [m.get("id") for m in models],
               "field_types": {k: sorted(v) for k, v in fields.items()},
               "is_default_true": defaults,
               "catalog_stable_two_requests": stable}
    STORE.write_json("T04/summary.json", summary, instances=["DIFF-02", "TPT-02"], kind="T04_summary")
    print("T04 catalog:", json.dumps(summary, ensure_ascii=False)[:600])
    return summary


# ---------------------------------------------------------------- T05

def T05():
    out = {}
    # A 历史：assistant 字符串（已知可用）
    rA = call("/responses", responses_body("flash", input_items=[
        {"role": "user", "content": "记住标记 M_a1，回答 OK"},
        {"role": "assistant", "content": "OK"},
        {"role": "user", "content": "刚才的标记是什么？只输出标记本身。"},
    ], stream=False, max_output_tokens=256), cid="T05/A")
    objA = None
    try:
        objA = json.loads(rA.body_text)
    except Exception:
        pass
    out["A_str_assistant"] = {"http": rA.http_status, "text": visible_text(objA)}
    # B 历史：assistant output_text 数组（预期 400，复现原 attempt）
    rB = call("/responses", responses_body("flash", input_items=[
        {"role": "user", "content": [{"type": "input_text", "text": "记住标记 M_b1，回答 OK"}]},
        {"role": "assistant", "content": [{"type": "output_text", "text": "OK"}]},
        {"role": "user", "content": [{"type": "input_text", "text": "刚才的标记是什么？只输出标记本身。"}]},
    ], stream=False, max_output_tokens=256), cid="T05/B")
    objB = None
    try:
        objB = json.loads(rB.body_text)
    except Exception:
        pass
    err = (objB or {}).get("error", {}) if isinstance(objB, dict) else {}
    out["B_arr_assistant"] = {"http": rB.http_status,
                              "error_head": (err.get("message") or rB.body_text)[:160]}
    # C 工具第一轮真实 output items
    rC1 = call("/responses", responses_body("flash", text="调用 add_numbers，参数 a=17 b=25。",
                                            stream=True, max_output_tokens=256,
                                            tools=[add_numbers_tool()], tool_choice="required"),
               stream=True, cid="T05/C1")
    ns1 = normalize(rC1, "responses")
    tc = None
    for k, v in ns1.tool_calls.items():
        tc = v
        break
    c1 = {"http": rC1.http_status, "terminal": ns1.terminal,
          "call_id": tc.call_id if tc else None, "name": tc.name if tc else None,
          "args": (tc.final_arguments if tc and tc.final_arguments is not None else (tc.arguments if tc else None))}
    out["C1_tool_first"] = c1
    final_text = None
    if tc and tc.call_id:
        items = [
            {"role": "user", "content": [{"type": "input_text", "text": "调用 add_numbers，参数 a=17 b=25。"}]},
            {"type": "function_call", "id": tc.item_id or "fc_x", "call_id": tc.call_id,
             "name": "add_numbers", "arguments": c1["args"]},
            {"type": "function_call_output", "call_id": tc.call_id, "output": "42"},
        ]
        rC2 = call("/responses", responses_body("flash", input_items=items, stream=True,
                                                max_output_tokens=256, tools=[add_numbers_tool()]),
                   stream=True, cid="T05/C2")
        ns2 = normalize(rC2, "responses")
        final_text = ns2.text
        out["C2_tool_reuse"] = {"http": rC2.http_status, "terminal": ns2.terminal, "text": ns2.text}
        STORE.write_json("T05/C2_stream_events.json",
                         {"frames": [{"t": rC2.rel(f.t), "event": f.event, "data": f.data[:1200]}
                                     for f in rC2.frames]},
                         instances=["TPT-07"], kind="T05_C2")
    STORE.write_json("T05/summary.json", out, instances=["DIFF-04", "TPT-07"], kind="T05_summary")
    print("T05:", json.dumps(out, ensure_ascii=False)[:700])
    return out


# ---------------------------------------------------------------- T06

def T06():
    recs = []
    prompts = {"normal": ("只输出 GW_CHECK_7c91", 256),
               "b32": ("请写一篇很长的文章论述时间序列预测，越详细越好。", 32),
               "b16": ("请写一篇很长的文章论述时间序列预测，越详细越好。", 16),
               "b512": ("请写一篇很长的文章论述时间序列预测，越详细越好。", 512)}
    for tag, (prompt, mx) in prompts.items():
        for form in ("nonstream", "stream"):
            for s in range(2):
                body = responses_body("flash", text=prompt, stream=(form == "stream"), max_output_tokens=mx)
                r = call("/responses", body, stream=(form == "stream"), cid=f"T06/{tag}/{form}/{s}")
                entry = {"tag": tag, "form": form, "sample": s, "http": r.http_status,
                         "error_kind": r.error_kind}
                if form == "stream":
                    ns = normalize(r, "responses")
                    entry.update({"terminal": ns.terminal, "terminal_reason": ns.terminal_reason,
                                  "text_len": len(ns.text), "usage": ns.usage,
                                  "last_event": (r.frames[-1].event if r.frames else None)})
                else:
                    obj = None
                    try:
                        obj = json.loads(r.body_text)
                    except Exception:
                        pass
                    entry.update({"status": (obj or {}).get("status"),
                                  "incomplete_details": (obj or {}).get("incomplete_details"),
                                  "text_len": len(visible_text(obj)), "usage": resp_usage(obj)})
                recs.append(entry)
    STORE.write_json("T06/terminal_pairs.json", recs, instances=["DIFF-07"], kind="T06_pairs")
    print("T06 pairs:")
    for x in recs:
        term = x.get("terminal") or x.get("status")
        reason = x.get("terminal_reason") or ((x.get("incomplete_details") or {}).get("reason"))
        ot = (x.get("usage") or {}).get("output_tokens")
        print(f"  {x['tag']:7s} {x['form']:9s}#{x['sample']} http={x['http']} term={term} "
              f"reason={reason} out={ot} text_len={x['text_len']}")
    return recs


# ---------------------------------------------------------------- T07

def T07():
    out = {}
    # 正常完成对照（流式）
    rN = call("/responses", responses_body("flash", text=f"只输出 {CHECK_MARK}", stream=True,
                                           max_output_tokens=256), stream=True, cid="T07/normal")
    nN = normalize(rN, "responses")
    out["normal"] = {"http": rN.http_status, "terminal": nN.terminal, "text": nN.text}
    # 收到事件后客户端主动取消
    rC = call("/responses", responses_body("flash",
                                           text="请写一篇很长的文章论述时间序列预测，越详细越好。",
                                           stream=True, max_output_tokens=512),
              stream=True, cid="T07/cancel", cancel_after=1.5)
    nC = normalize(rC, "responses")
    out["cancel"] = {"http": rC.http_status, "closed_by_client": rC.closed_by_client,
                     "error_kind": rC.error_kind, "frames": len(rC.frames),
                     "last_event": (rC.frames[-1].event if rC.frames else None),
                     "terminal": nC.terminal, "usage": nC.usage, "text_len": len(nC.text)}
    STORE.write_json("T07/tpt08_terminal.json", out, instances=["TPT-08"], kind="T07_tpt08")
    print("T07:", json.dumps(out, ensure_ascii=False)[:600])
    return out


# ---------------------------------------------------------------- T08

def _png(width, height, blocks):
    rows = []
    for y in range(height):
        row = bytearray()
        for x in range(width):
            red = False
            for (bx, by, bs) in blocks:
                if bx <= x < bx + bs and by <= y < by + bs:
                    red = True
                    break
            row += b"\xff\x00\x00" if red else b"\xff\xff\xff"
        rows.append(bytes(row))

    def chunk(typ, data):
        return struct.pack(">I", len(data)) + typ + data + struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    raw = b"".join(b"\x00" + r for r in rows)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


def T08():
    png = _png(64, 64, [(6, 26, 12), (26, 26, 12), (46, 26, 12)])
    store_dir = os.path.join(ROOT, "补测", "todo_1", "证据", "T08")
    os.makedirs(store_dir, exist_ok=True)
    png_path = os.path.join(store_dir, "three_blocks_v2.png")
    with open(png_path, "wb") as f:
        f.write(png)
    img_hash = sha256_file(png_path)
    data_url = "data:image/png;base64," + base64.b64encode(png).decode()
    out = {"image_sha256": img_hash, "image_bytes": len(png), "expected_answer": "3", "trials": []}
    for model in ["pro", "flash-backup-ds", "flash"]:
        items = [{"role": "user", "content": [
            {"type": "input_text", "text": "图中有几个红色方块？只输出数字。"},
            {"type": "input_image", "image_url": data_url},
        ]}]
        r = call("/responses", responses_body(model, input_items=items, stream=False,
                                              max_output_tokens=1024), cid=f"T08/{model}")
        obj = None
        try:
            obj = json.loads(r.body_text)
        except Exception:
            pass
        reasoning = reasoning_text(obj)
        trial = {"model": model, "declared_image": model in ("pro", "flash-backup-ds"),
                 "http": r.http_status, "status": (obj or {}).get("status"),
                 "text": visible_text(obj), "reasoning_len": len(reasoning),
                 "usage": resp_usage(obj),
                 "raw_head": r.body_text[:1500],
                 "error_head": ((obj or {}).get("error") or {}).get("message", "")[:160] if isinstance(obj, dict) else r.body_text[:160]}
        out["trials"].append(trial)
        # 文本无图对照（同模型、同问题、去掉图片）
        rc = call("/responses", responses_body(model, input_items=[
            {"role": "user", "content": [{"type": "input_text", "text": "返回数字 3。"}]}],
            stream=False, max_output_tokens=256), cid=f"T08/{model}/textonly")
        oc = None
        try:
            oc = json.loads(rc.body_text)
        except Exception:
            pass
        out.setdefault("text_only_control", []).append(
            {"model": model, "http": rc.http_status, "text": visible_text(oc)})
    STORE.write_json("T08/image_trials.json", out, instances=["DIFF-03", "TPT-05"], kind="T08_image")
    print("T08:", json.dumps(out, ensure_ascii=False)[:700])
    return out


# ---------------------------------------------------------------- T09

def T09():
    """抽查 API-05/06、API-10 的实际断言值与 evidence。"""
    res = {}
    for iid, path in [("API-05", "证据/api/API-05_tpt-gateway-public_turn2.json"),
                      ("API-06", "证据/api/API-06_tpt-gateway-public_turn2.json"),
                      ("API-10", "证据/api/API-10_tpt-gateway-public_json.json")]:
        p = os.path.join(ROOT, path)
        if os.path.exists(p):
            res[iid] = {"exists": True, "sha256": sha256_file(p)}
        else:
            res[iid] = {"exists": False}
    STORE.write_json("T09/spotcheck_sources.json", res, instances=["API-05", "API-06", "API-10"],
                     kind="T09_spotcheck")
    print("T09 spotcheck:", json.dumps(res, ensure_ascii=False))
    return res


STEPS = {"T03": T03, "T04": T04, "T05": T05, "T06": T06, "T07": T07, "T08": T08, "T09": T09}


def main(argv):
    if not KEY:
        print("[warn] TPT_API_KEY 未设置")
    todo = argv[1:] or list(STEPS)
    for name in todo:
        fn = STEPS.get(name)
        if fn:
            print(f"== {name} ==")
            fn()
    print("real requests this invocation:", COUNTER["n"])
    # 记录脚本版本
    STORE.write_json("run/code_version.json",
                     {"script": "code/todo1_recheck.py", "sha256": sha256_file(os.path.abspath(__file__)),
                      "steps": todo, "requests": COUNTER["n"]},
                     instances=["todo_1"], kind="code_version")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
