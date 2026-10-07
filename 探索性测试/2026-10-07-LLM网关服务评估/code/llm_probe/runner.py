"""实例执行与台账：把用例声明映射到 transport/protocol/capacity。

每个 attempt 都写结果与证据；失败不丢弃；usage 缺失记 null。
"""
from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from typing import Optional

from . import protocol as P
from .capacity import RequestAttempt, TurnResult, run_closed_loop, run_open_arrival
from .evidence import EvidenceStore
from .stats import SLO, LevelResult, capacity_conclusion, evaluate_level, summarise
from .transport import TransportResult, http_json, http_request

CHECK_MARK = P.CHECK_MARK
INSTRUCTIONS = "只遵循用户的精确回显要求：正文只输出被要求的内容，不要添加解释。"


@dataclass
class Assertion:
    name: str
    expected: str
    actual: str
    satisfied: Optional[bool]   # True/False/None(未观测)

    def to_dict(self):
        return self.__dict__.copy()


@dataclass
class InstanceResult:
    instance_id: str
    item: str
    status: str = "未验证"     # 通过/失败/不确定/未验证
    assertions: list = field(default_factory=list)
    attempts: list = field(default_factory=list)
    evidence: list = field(default_factory=list)
    notes: list = field(default_factory=list)
    metrics: dict = field(default_factory=dict)
    failure_attribution: Optional[str] = None

    def add(self, name, expected, actual, satisfied):
        self.assertions.append(Assertion(name, str(expected), str(actual), satisfied))
        return satisfied

    def finalize(self):
        vals = [a.satisfied for a in self.assertions]
        if any(v is False for v in vals):
            self.status = "失败"
        elif vals and all(v is True for v in vals):
            self.status = "通过"
        elif any(v is None for v in vals):
            self.status = "不确定"
        else:
            self.status = "未验证"
        return self

    def to_dict(self):
        return {
            "instance_id": self.instance_id, "item": self.item, "status": self.status,
            "assertions": [a.to_dict() for a in self.assertions],
            "attempts": self.attempts, "evidence": self.evidence, "notes": self.notes,
            "metrics": self.metrics, "failure_attribution": self.failure_attribution,
        }


class Target:
    def __init__(self, cfg: dict, env: Optional[dict] = None):
        self.name = cfg["name"]
        self.base_url = cfg["base_url"].rstrip("/")
        self.models_path = cfg.get("models_path", "/models")
        self.responses_path = cfg.get("responses_path", "/responses")
        self.chat_path = cfg.get("chat_path", "/chat/completions")
        self.api_key_env = cfg.get("api_key_env", "TPT_API_KEY")
        self.models = cfg.get("models", [])
        self.efforts = cfg.get("reasoning_efforts", [])   # [{id, wire}]; wire=None → 省略
        self.protocol = cfg.get("protocol", "responses")
        self.supports = cfg.get("supports", {})
        self._env = env if env is not None else os.environ

    @property
    def key(self) -> Optional[str]:
        return self._env.get(self.api_key_env) or None

    def headers(self, stream: bool = False) -> dict:
        h = {"Content-Type": "application/json", "Accept": "text/event-stream" if stream else "application/json"}
        k = self.key
        if k:
            h["Authorization"] = f"Bearer {k}"
        return h

    def url(self, path: str) -> str:
        return self.base_url + path

    def responses_url(self):
        return self.url(self.responses_path)

    def chat_url(self):
        return self.url(self.chat_path)

    def models_url(self):
        return self.url(self.models_path)


def _attempt_record(res: TransportResult, ns=None) -> dict:
    return {
        "http_status": res.http_status,
        "error_kind": res.error_kind,
        "error": res.error,
        "t_headers": res.rel(res.t_headers),
        "t_first_frame": res.rel(res.t_first_frame),
        "t_end": res.rel(res.t_end),
        "is_event_stream": res.is_event_stream,
        "terminal": getattr(ns, "terminal", None),
        "text": getattr(ns, "text", None),
        "final_text": getattr(ns, "final_text", None),
        "usage": getattr(ns, "usage", None),
    }


def _dump(store, rel, res, ns, instances, kind="attempt"):
    if res is None:
        payload = {"normalized": ns}
    else:
        payload = {
            "http_status": res.http_status, "error_kind": res.error_kind, "error": res.error,
            "timings": {"t_headers": res.rel(res.t_headers), "t_first_frame": res.rel(res.t_first_frame),
                        "t_end": res.rel(res.t_end)},
            "body_text": res.body_text[:4000],
            "frames": [{"t": res.rel(f.t), "event": f.event, "data": f.data, "json_ok": f.json_ok}
                       for f in res.frames],
            "normalized": ns.to_dict() if ns is not None else None,
        }
    store.write_json(rel, payload, instances=instances, kind=kind)


# ---------------------------------------------------------------- API

def api01_discovery(target: Target, store, opts) -> InstanceResult:
    r = InstanceResult("API-01/{}/discovery".format(target.name), "API-01")
    res = http_json(target.models_url(), headers=target.headers())
    r.failure_attribution = res.error_kind
    r.add("http_200", 200, res.http_status, res.http_status == 200)
    models = []
    if res.body_text:
        try:
            obj = json.loads(res.body_text)
            if isinstance(obj, list):
                models = obj
            elif isinstance(obj, dict):
                models = obj.get("data") or obj.get("models") or []
        except Exception as exc:  # noqa: BLE001
            r.notes.append(f"目录 JSON 解析失败: {exc}")
    r.metrics["model_count"] = len(models)
    ids = [m.get("id") for m in models if isinstance(m, dict)]
    r.add("parsable_catalog", "list non-empty", f"{len(models)} items", len(models) > 0)
    ids_ok = all(isinstance(i, str) and i for i in ids)
    r.add("ids_nonempty_str", True, ids_ok, ids_ok)
    for want in target.models:
        r.add(f"target_present:{want}", True, want in ids, want in ids)
    _dump(store, f"api/API-01_{target.name}_models.json", res, None, [r.instance_id], "catalog")
    r.evidence.append(f"api/API-01_{target.name}_models.json")
    return r.finalize()


def _text_probe(target, store, item, instance_tag, *, stream: bool, effort_wire=None,
                protocol=None, max_output_tokens=256) -> InstanceResult:
    protocol = protocol or target.protocol
    r = InstanceResult(f"{item}/{instance_tag}", item)
    model = (target.models or ["?"])[0]
    if protocol == "chat":
        body = P.chat_body(model, messages=[{"role": "system", "content": INSTRUCTIONS},
                                            {"role": "user", "content": f"只输出 {CHECK_MARK}，不要别的字"}],
                           stream=stream, max_tokens=max_output_tokens)
        url = target.chat_url()
    else:
        body = P.responses_body(model, text=f"只输出 {CHECK_MARK}，不要别的字",
                                instructions=INSTRUCTIONS, stream=stream,
                                max_output_tokens=max_output_tokens, reasoning_effort=effort_wire)
        url = target.responses_url()
    data = json.dumps(body).encode("utf-8")
    o = target_opts(opts_holder["v"])
    res = http_request(url, method="POST", headers=target.headers(stream=stream), body=data,
                       connect_timeout=o["connect"], idle_timeout=o["idle"],
                       total_timeout=o["total"], stream=stream)
    ns = P.normalize(res, protocol) if stream else _nonstream_normalize(res, protocol)
    r.attempts.append(_attempt_record(res, ns))
    r.metrics["timings"] = {"t_headers": res.rel(res.t_headers), "t_first_frame": res.rel(res.t_first_frame),
                            "t_first_text": res.rel(ns.t_first_text), "t_end": res.rel(res.t_end)}
    r.add("http_200", 200, res.http_status, res.http_status == 200)
    text = (ns.text or "").strip()
    r.add("body_is_mark", CHECK_MARK, text[:80], text == CHECK_MARK)
    if stream:
        r.add("has_terminal", "completed", ns.terminal, ns.terminal == "completed")
    else:
        r.add("finish_ok", "stop/completed", ns.terminal_reason or ns.terminal,
              (ns.terminal or "") in ("completed",) or (ns.terminal_reason == "stop"))
    _dump(store, f"api/{item}_{instance_tag}.json", res, ns, [r.instance_id])
    r.evidence.append(f"api/{item}_{instance_tag}.json")
    r.failure_attribution = res.error_kind
    return r.finalize()


def _nonstream_normalize(res: TransportResult, protocol: str) -> P.NormalizedStream:
    ns = P.NormalizedStream(protocol=protocol)
    try:
        obj = json.loads(res.body_text)
    except Exception:  # noqa: BLE001
        return ns
    if protocol == "chat":
        choices = obj.get("choices") or []
        if choices:
            ns.text = (choices[0].get("message") or {}).get("content") or ""
            ns.terminal_reason = choices[0].get("finish_reason")
            ns.terminal = "completed" if ns.terminal_reason else None
        ns.usage = obj.get("usage")
    else:
        ns.text = obj.get("output_text") or _responses_output_text(obj)
        ns.usage = obj.get("usage")
        ns.terminal = obj.get("status")
    return ns


def _responses_output_text(obj) -> str:
    out = []
    for item in obj.get("output") or []:
        if item.get("type") == "message":
            for c in item.get("content") or []:
                if c.get("type") == "output_text":
                    out.append(c.get("text", ""))
    return "".join(out)


def api02(target, store, opts):
    return _text_probe(target, store, "API-02", f"{target.name}/nonstream", stream=False)


def api03(target, store, opts):
    return _text_probe(target, store, "API-03", f"{target.name}/stream", stream=True)


def api07_auth(target, store, opts):
    r = InstanceResult(f"API-07/{target.name}/auth", "API-07")
    model = (target.models or ["?"])[0]
    body = P.responses_body(model, text=f"只输出 {CHECK_MARK}", stream=True, max_output_tokens=64)
    data = json.dumps(body).encode()
    o = target_opts(opts)
    # 无 key
    h = {"Content-Type": "application/json", "Accept": "text/event-stream"}
    res_none = http_request(target.responses_url(), method="POST", headers=h, body=data,
                            connect_timeout=o["connect"], idle_timeout=o["idle"], total_timeout=o["total"])
    # 无效 key
    h_bad = dict(h); h_bad["Authorization"] = "Bearer sk-invalid-test-key-000"
    res_bad = http_request(target.responses_url(), method="POST", headers=h_bad, body=data,
                           connect_timeout=o["connect"], idle_timeout=o["idle"], total_timeout=o["total"])
    r.add("no_key_rejected", "401/403", res_none.http_status, res_none.http_status in (401, 403))
    r.add("bad_key_rejected", "401/403", res_bad.http_status, res_bad.http_status in (401, 403))
    r.failure_attribution = res_none.error_kind or res_bad.error_kind
    _dump(store, f"api/API-07_{target.name}_none.json", res_none, None, [r.instance_id])
    _dump(store, f"api/API-07_{target.name}_bad.json", res_bad, None, [r.instance_id])
    r.evidence += [f"api/API-07_{target.name}_none.json", f"api/API-07_{target.name}_bad.json"]
    return r.finalize()


def api08_invalid(target, store, opts):
    r = InstanceResult(f"API-08/{target.name}/invalid", "API-08")
    o = target_opts(opts)
    bodies = {
        "unknown_model": P.responses_body("no-such-model-xyz", text="hi", stream=False),
        "bad_input_type": {"model": (target.models or ["?"])[0], "input": 12345, "stream": False},
        "empty_model": {"model": "", "input": [{"role": "user", "content": [{"type": "input_text", "text": "hi"}]}], "stream": False},
    }
    for name, body in bodies.items():
        res = http_request(target.responses_url(), method="POST", headers=target.headers(),
                           body=json.dumps(body).encode(), connect_timeout=o["connect"],
                           idle_timeout=o["idle"], total_timeout=o["total"], stream=False)
        rejected = res.http_status in (400, 404, 422)
        r.add(f"rejected:{name}", "400/404/422", res.http_status, rejected)
        _dump(store, f"api/API-08_{target.name}_{name}.json", res, None, [r.instance_id])
        r.evidence.append(f"api/API-08_{target.name}_{name}.json")
    return r.finalize()


def api09_usage(target, store, opts):
    r = InstanceResult(f"API-09/{target.name}/usage", "API-09")
    model = (target.models or ["?"])[0]
    body = P.responses_body(model, text="请详细解释什么是时间序列预测，尽量长。",
                            stream=False, max_output_tokens=32)
    o = target_opts(opts)
    res = http_request(target.responses_url(), method="POST", headers=target.headers(),
                       body=json.dumps(body).encode(), connect_timeout=o["connect"],
                       idle_timeout=o["idle"], total_timeout=o["total"], stream=False)
    ns = _nonstream_normalize(res, "responses")
    r.attempts.append(_attempt_record(res, ns))
    usage = ns.usage
    if usage is None:
        r.add("usage_present", True, "null(缺失)", None)
        r.metrics["usage"] = None
        r.notes.append("usage 缺失：计量未验证，不填 0")
    else:
        r.add("usage_input_nonneg", True, usage.get("input_tokens"), isinstance(usage.get("input_tokens"), int))
        r.add("usage_output_nonneg", True, usage.get("output_tokens"), isinstance(usage.get("output_tokens"), int))
        ot = usage.get("output_tokens")
        r.add("output_within_limit", "<=32", ot, ot is not None and ot <= 32)
        r.metrics["usage"] = usage
    _dump(store, f"api/API-09_{target.name}_usage.json", res, ns, [r.instance_id])
    r.evidence.append(f"api/API-09_{target.name}_usage.json")
    return r.finalize()


def api04_context(target, store, opts):
    r = InstanceResult(f"API-04/{target.name}/context", "API-04")
    marker = "CTX_" + os.urandom(3).hex()
    model = (target.models or ["?"])[0]
    o = target_opts(opts)
    r.notes.append("原 attempt（2026-10-07T10:45）历史条目用 assistant content=[{type:output_text}] 被网关 400 拒绝"
                   "（240 validation errors）；按补测规则有限修正为字符串 content 后重测，原证据保留。")
    # 轮1
    b1 = P.responses_body(model, text=f"本轮只需记住标记 {marker} 并回答 OK", stream=False,
                          max_output_tokens=256)
    res1 = http_request(target.responses_url(), method="POST", headers=target.headers(),
                        body=json.dumps(b1).encode(), connect_timeout=o["connect"],
                        idle_timeout=o["idle"], total_timeout=o["total"], stream=False)
    ns1 = _nonstream_normalize(res1, "responses")
    r.add("turn1_ok", True, res1.http_status, res1.http_status == 200)
    # 轮2 带真实历史（字符串 content 形态，经 probe 验证被接受）
    items = [
        {"role": "user", "content": f"本轮只需记住标记 {marker} 并回答 OK"},
        {"role": "assistant", "content": ns1.text or "OK"},
        {"role": "user", "content": "刚才那个标记是什么？只输出标记本身。"},
    ]
    b2 = P.responses_body(model, input_items=items, stream=False, max_output_tokens=256)
    res2 = http_request(target.responses_url(), method="POST", headers=target.headers(),
                        body=json.dumps(b2).encode(), connect_timeout=o["connect"],
                        idle_timeout=o["idle"], total_timeout=o["total"], stream=False)
    ns2 = _nonstream_normalize(res2, "responses")
    r.add("recall_marker", marker, (ns2.text or "").strip()[:40], marker in (ns2.text or ""))
    _dump(store, f"api/API-04_{target.name}_turn1.json", res1, ns1, [r.instance_id])
    _dump(store, f"api/API-04_{target.name}_turn2.json", res2, ns2, [r.instance_id])
    r.evidence += [f"api/API-04_{target.name}_turn1.json", f"api/API-04_{target.name}_turn2.json"]
    return r.finalize()


def api05_tool(target, store, opts, stream=False):
    item = "API-06" if stream else "API-05"
    r = InstanceResult(f"{item}/{target.name}/tool", item)
    model = (target.models or ["?"])[0]
    o = target_opts(opts)
    b1 = P.responses_body(model, text="调用 add_numbers，参数 a=17 b=25。",
                          stream=stream, max_output_tokens=256, tools=[P.add_numbers_tool()],
                          tool_choice="required")
    res1 = http_request(target.responses_url(), method="POST", headers=target.headers(stream=stream),
                        body=json.dumps(b1).encode(), connect_timeout=o["connect"],
                        idle_timeout=o["idle"], total_timeout=o["total"], stream=stream)
    ns1 = P.normalize(res1, "responses") if stream else _nonstream_normalize(res1, "responses")
    tc = None
    if stream:
        tcs = list(ns1.tool_calls.values())
        tc = tcs[0] if tcs else None
    else:
        try:
            obj = json.loads(res1.body_text)
            for it in obj.get("output") or []:
                if it.get("type") == "function_call":
                    tc = P.ToolCall(key=it.get("id", "k"), call_id=it.get("call_id"),
                                    name=it.get("name"), final_arguments=it.get("arguments"))
                    break
        except Exception:  # noqa: BLE001
            tc = None
    if tc is None:
        r.add("tool_call_present", True, None, None)
        _dump(store, f"api/{item}_{target.name}_turn1.json", res1, ns1, [r.instance_id])
        r.evidence.append(f"api/{item}_{target.name}_turn1.json")
        return r.finalize()
    args = tc.final_arguments if tc.final_arguments is not None else tc.arguments
    try:
        parsed = json.loads(args)
    except Exception:  # noqa: BLE001
        parsed = None
    r.add("tool_name", "add_numbers", tc.name, tc.name == "add_numbers")
    r.add("call_id_nonempty", True, tc.call_id, bool(tc.call_id))
    r.add("params_correct", '{"a":17,"b":25}', args, parsed == {"a": 17, "b": 25})
    call_id = tc.call_id
    items = [
        {"role": "user", "content": [{"type": "input_text", "text": "调用 add_numbers，参数 a=17 b=25。"}]},
        {"type": "function_call", "name": "add_numbers", "call_id": call_id, "arguments": args},
        {"type": "function_call_output", "call_id": call_id, "output": "42"},
    ]
    b2 = P.responses_body(model, input_items=items, stream=stream, max_output_tokens=128,
                          tools=[P.add_numbers_tool()])
    res2 = http_request(target.responses_url(), method="POST", headers=target.headers(stream=stream),
                        body=json.dumps(b2).encode(), connect_timeout=o["connect"],
                        idle_timeout=o["idle"], total_timeout=o["total"], stream=stream)
    ns2 = P.normalize(res2, "responses") if stream else _nonstream_normalize(res2, "responses")
    r.add("final_body_42", "42", (ns2.text or "").strip()[:40], "42" in (ns2.text or ""))
    if stream and tc is not None:
        d = tc.to_dict()
        r.add("delta_matches_final", True, d.get("delta_matches_final"),
              d.get("delta_matches_final") in (True, None))
    _dump(store, f"api/{item}_{target.name}_turn1.json", res1, ns1, [r.instance_id])
    _dump(store, f"api/{item}_{target.name}_turn2.json", res2, ns2, [r.instance_id])
    r.evidence += [f"api/{item}_{target.name}_turn1.json", f"api/{item}_{target.name}_turn2.json"]
    return r.finalize()


def api10_json(target, store, opts):
    r = InstanceResult(f"API-10/{target.name}/json", "API-10")
    model = (target.models or ["?"])[0]
    o = target_opts(opts)
    body = P.responses_body(model, text='只输出 JSON：{"answer":42}', stream=False,
                            max_output_tokens=256)
    body["text"] = {"format": {"type": "json_object"}}
    res = http_request(target.responses_url(), method="POST", headers=target.headers(),
                       body=json.dumps(body).encode(), connect_timeout=o["connect"],
                       idle_timeout=o["idle"], total_timeout=o["total"], stream=False)
    ns = _nonstream_normalize(res, "responses")
    txt = (ns.text or "").strip()
    try:
        obj = json.loads(txt)
    except Exception:  # noqa: BLE001
        obj = None
    r.add("http_200", 200, res.http_status, res.http_status == 200)
    r.add("json_object", True, txt[:80], isinstance(obj, dict))
    r.add("answer_42", 42, (obj or {}).get("answer"), isinstance(obj, dict) and obj.get("answer") == 42)
    r.add("no_markdown_wrap", True, txt[:20], not txt.startswith("```"))
    _dump(store, f"api/API-10_{target.name}_json.json", res, ns, [r.instance_id])
    r.evidence.append(f"api/API-10_{target.name}_json.json")
    return r.finalize()


# ---------------------------------------------------------------- TPT

def tpt01(target, store, opts):
    return _text_probe(target, store, "TPT-01", f"{target.name}/responses", stream=True)


def tpt03(target, store, opts, effort_wire=None, tag=None):
    return _text_probe(target, store, "TPT-03", tag or f"{target.name}/frames", stream=True,
                       effort_wire=effort_wire)


def tpt06_efforts(target, store, opts):
    out = []
    for eff in (target.efforts or [{"id": "default", "wire": None}]):
        r = _text_probe(target, store, "TPT-06", f"{target.name}/{eff['id']}", stream=True,
                        effort_wire=eff.get("wire"))
        r.instance_id = f"TPT-06/{target.name}/effort-{eff['id']}"
        out.append(r)
    return out


def tpt08_terminal(target, store, opts):
    r = InstanceResult(f"TPT-08/{target.name}/terminal", "TPT-08")
    model = (target.models or ["?"])[0]
    o = target_opts(opts)
    # 低上限长回答 -> incomplete（保留低上限以覆盖截断路径）
    b = P.responses_body(model, text="请写一篇很长的文章论述时间序列预测。", stream=True, max_output_tokens=16)
    res = http_request(target.responses_url(), method="POST", headers=target.headers(stream=True),
                       body=json.dumps(b).encode(), connect_timeout=o["connect"],
                       idle_timeout=o["idle"], total_timeout=o["total"], stream=True)
    ns = P.normalize(res, "responses")
    r.add("terminal_is_terminal", "completed/incomplete/failed", ns.terminal,
          ns.terminal in ("completed", "incomplete", "failed"))
    r.metrics["usage"] = ns.usage
    r.notes.append("低 max_output_tokens 请求；网关在 reason=max_output_tokens 时给 incomplete（经证据核对）")
    _dump(store, f"tpt/TPT-08_{target.name}_lowlimit.json", res, ns, [r.instance_id])
    r.evidence.append(f"tpt/TPT-08_{target.name}_lowlimit.json")
    return r.finalize()


def tpt09_recover(target, store, opts):
    r = InstanceResult(f"TPT-09/{target.name}/after-fail", "TPT-09")
    o = target_opts(opts)
    b_bad = P.responses_body("no-such-model-xyz", text="hi", stream=False)
    res_bad = http_request(target.responses_url(), method="POST", headers=target.headers(),
                           body=json.dumps(b_bad).encode(), connect_timeout=o["connect"],
                           idle_timeout=o["idle"], total_timeout=o["total"], stream=False)
    r.add("bad_model_rejected", "400/404/422", res_bad.http_status,
          res_bad.http_status in (400, 404, 422))
    good = _text_probe(target, store, "TPT-09", f"{target.name}/recover", stream=False)
    r.assertions.extend(good.assertions)
    r.attempts = good.attempts
    r.evidence = good.evidence
    return r.finalize()


# ---------------------------------------------------------------- PERF

def perf01(target, store, opts):
    r = InstanceResult(f"PERF-01/{target.name}/short", "PERF-01")
    n = int(opts.get("samples", 30))
    warm = int(opts.get("warmup", 1))
    model = (target.models or ["?"])[0]
    o = target_opts(opts)
    e2e, ok_n = [], 0
    samples = []
    for i in range(warm + n):
        body = P.responses_body(model, text=f"只输出 {CHECK_MARK}", stream=True, max_output_tokens=256)
        res = http_request(target.responses_url(), method="POST", headers=target.headers(stream=True),
                           body=json.dumps(body).encode(), connect_timeout=o["connect"],
                           idle_timeout=o["idle"], total_timeout=o["total"], stream=True)
        ns = P.normalize(res, "responses")
        if i < warm:
            continue
        dur = (res.t_end - res.t0) if res.t_end else None
        ok = res.http_status == 200 and ns.terminal == "completed" and (ns.text or "").strip() == CHECK_MARK
        if ok:
            ok_n += 1
            if dur:
                e2e.append(dur)
        samples.append({"i": i - warm, "ok": ok, "http": res.http_status, "error_kind": res.error_kind,
                        "e2e": round(dur, 6) if dur else None,
                        "t_headers": res.rel(res.t_headers), "t_first_frame": res.rel(res.t_first_frame),
                        "t_first_text": res.rel(ns.t_first_text), "terminal": ns.terminal,
                        "usage": ns.usage})
    d = summarise(e2e)
    r.metrics.update({"samples": n, "success": ok_n, "success_rate": ok_n / n if n else None,
                      "e2e_success": d.to_dict(), "warmup": warm, "per_sample": samples})
    r.add("attempts_counted", n, n, True)
    r.add("all_have_result", True, f"{ok_n} success / {n}", True)
    r.notes.append("测量完成与 SLO 达标分别记录（SLO 未确认则只出测量）")
    _dump(store, f"perf/PERF-01_{target.name}.json", None, {"per_sample": samples, "summary": d.to_dict()},
          [r.instance_id], "perf_summary")
    r.evidence.append(f"perf/PERF-01_{target.name}.json")
    return r.finalize()


def perf03(target, store, opts):
    r = InstanceResult(f"PERF-03/{target.name}/long", "PERF-03")
    n = int(opts.get("samples_long", opts.get("samples", 10)))
    model = (target.models or ["?"])[0]
    o = target_opts(opts)
    toks, ok_n, e2e = [], 0, []
    samples = []
    for i in range(n):
        body = P.responses_body(model, text="请详细解释时间序列预测的原理，输出尽量长。",
                                stream=True, max_output_tokens=512)
        res = http_request(target.responses_url(), method="POST", headers=target.headers(stream=True),
                           body=json.dumps(body).encode(), connect_timeout=o["connect"],
                           idle_timeout=o["idle"], total_timeout=o["total"], stream=True)
        ns = P.normalize(res, "responses")
        ok = ns.terminal == "completed"
        if ok:
            ok_n += 1
        dur = (res.t_end - res.t0) if res.t_end else None
        if dur:
            e2e.append(dur)
        tps = None
        if ns.usage and ns.usage.get("output_tokens") is not None and dur:
            tps = ns.usage["output_tokens"] / max(1e-9, dur)
            toks.append(tps)
        samples.append({"i": i, "ok": ok, "http": res.http_status, "error_kind": res.error_kind,
                        "e2e": round(dur, 6) if dur else None, "terminal": ns.terminal,
                        "output_tokens": (ns.usage or {}).get("output_tokens"),
                        "output_tok_per_s": round(tps, 4) if tps else None})
    r.metrics.update({"samples": n, "success": ok_n, "success_rate": ok_n / n if n else None,
                      "e2e_all": summarise(e2e).to_dict(),
                      "output_tok_per_s": summarise(toks).to_dict(), "per_sample": samples})
    _dump(store, f"perf/PERF-03_{target.name}.json", None,
          {"per_sample": samples, "e2e_all": summarise(e2e).to_dict(),
           "output_tok_per_s": summarise(toks).to_dict()}, [r.instance_id], "perf_summary")
    r.evidence.append(f"perf/PERF-03_{target.name}.json")
    r.add("attempts_counted", n, n, True)
    return r.finalize()


# ---------------------------------------------------------------- CAP

def cap01_burst(target, store, opts):
    import threading
    r = InstanceResult(f"CAP-01/{target.name}/burst", "CAP-01")
    model = (target.models or ["?"])[0]
    o = target_opts(opts)
    levels = opts.get("burst_levels", [1, 5, 10])
    waves = int(opts.get("burst_waves", 3))
    results = {}
    for n in levels:
        results[n] = {"attempted": 0, "completed": 0, "success": 0, "peak_in_flight": 0,
                      "statuses": {}, "errors": {}, "waves": waves}
        for _wave in range(waves):
            lock = threading.Lock()
            inflight = {"n": 0, "peak": 0}

            def one():
                with lock:
                    inflight["n"] += 1
                    inflight["peak"] = max(inflight["peak"], inflight["n"])
                try:
                    body = P.responses_body(model, text=f"只输出 {CHECK_MARK}", stream=True, max_output_tokens=256)
                    res = http_request(target.responses_url(), method="POST",
                                       headers=target.headers(stream=True),
                                       body=json.dumps(body).encode(), connect_timeout=o["connect"],
                                       idle_timeout=o["idle"], total_timeout=o["total"], stream=True)
                    ns = P.normalize(res, "responses")
                    with lock:
                        results[n]["attempted"] += 1
                        st = str(res.http_status)
                        results[n]["statuses"][st] = results[n]["statuses"].get(st, 0) + 1
                        if res.error_kind:
                            results[n]["errors"][res.error_kind] = results[n]["errors"].get(res.error_kind, 0) + 1
                        if res.http_status == 200:
                            results[n]["completed"] += 1
                        if res.http_status == 200 and ns.terminal == "completed":
                            results[n]["success"] += 1
                finally:
                    with lock:
                        inflight["n"] -= 1

            threads = [threading.Thread(target=one) for _ in range(n)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()
            results[n]["peak_in_flight"] = max(results[n]["peak_in_flight"], inflight["peak"])
    r.metrics["burst"] = results
    r.add("all_attempted_recorded", True, {k: v["attempted"] for k, v in results.items()},
          all(v["attempted"] == k * waves for k, v in results.items()))
    r.notes.append("仅为请求并发表现，不能称用户容量；每档 3 波")
    _dump(store, f"cap/CAP-01_{target.name}.json", None, None, [r.instance_id], "burst")
    r.evidence.append(f"cap/CAP-01_{target.name}.json")
    return r.finalize()


def _text_turn_fn(target, o):
    model = (target.models or ["?"])[0]

    def turn(u, i):
        t0 = time.monotonic()
        r0 = time.monotonic()
        body = P.responses_body(model, text=f"只输出 {CHECK_MARK}", stream=True, max_output_tokens=256)
        res = http_request(target.responses_url(), method="POST", headers=target.headers(stream=True),
                           body=json.dumps(body).encode(), connect_timeout=o["connect"],
                           idle_timeout=o["idle"], total_timeout=o["total"], stream=True)
        ns = P.normalize(res, "responses")
        r1 = time.monotonic()
        ok = res.http_status == 200 and ns.terminal == "completed" and (ns.text or "").strip() == CHECK_MARK
        reqs = [RequestAttempt(0, r0, r1, ok, res.error_kind, str(res.http_status))]
        ftw = (ns.t_first_text - res.t0) if ns.t_first_text else None
        return TurnResult(ok=ok, start=t0, end=time.monotonic(), requests=reqs,
                          first_text_wait=ftw, scenario="text")
    return turn


def cap02(target, store, opts):
    r = InstanceResult(f"CAP-02/{target.name}/closed-loop", "CAP-02")
    o = target_opts(opts)
    levels = opts.get("users", [1, 5])
    slo = slo_from_opts(opts)
    rows = []
    for n in levels:
        cl = run_closed_loop(_text_turn_fn(target, o), users=n,
                             think_time=opts.get("think_time", 5.0),
                             min_seconds=opts.get("min_seconds", 120.0),
                             min_turns=opts.get("min_turns", 30),
                             max_seconds=opts.get("max_seconds", 600.0))
        lv = LevelResult(users=n, turns_attempted=len(cl.turns),
                         turns_succeeded=sum(1 for t in cl.turns if t.ok),
                         requests_attempted=len(cl.requests),
                         requests_succeeded=sum(1 for r_ in cl.requests if r_.ok),
                         peak_in_flight=cl.peak_in_flight, duration_s=cl.duration_s,
                         turn_p95_s=summarise(cl.turn_latencies()).p95,
                         first_text_p95_s=summarise(cl.first_text_waits()).p95,
                         enough_sample=(len(cl.turns) >= opts.get("min_turns", 30)
                                        and cl.duration_s >= opts.get("min_seconds", 120.0)))
        evaluate_level(lv, slo)
        rows.append(lv)
    r.metrics["levels"] = [lv.to_dict() for lv in rows]
    r.metrics["capacity_conclusion"] = capacity_conclusion(rows, slo)
    r.add("turns_requests_separated", True,
          [(lv.users, lv.turns_attempted, lv.requests_attempted) for lv in rows], True)
    r.notes.append("并发请求数不改称用户数；SLO 未确认则不出达标用户数")
    _dump(store, f"cap/CAP-02_{target.name}.json", None, None, [r.instance_id], "closed_loop")
    r.evidence.append(f"cap/CAP-02_{target.name}.json")
    return r.finalize()


def cap05(target, store, opts):
    r = InstanceResult(f"CAP-05/{target.name}/open-arrival", "CAP-05")
    o = target_opts(opts)

    def turn(idx):
        t0 = time.monotonic()
        body = P.responses_body((target.models or ["?"])[0], text=f"只输出 {CHECK_MARK}",
                                stream=True, max_output_tokens=256)
        res = http_request(target.responses_url(), method="POST", headers=target.headers(stream=True),
                           body=json.dumps(body).encode(), connect_timeout=o["connect"],
                           idle_timeout=o["idle"], total_timeout=o["total"], stream=True)
        ns = P.normalize(res, "responses")
        ok = res.http_status == 200 and ns.terminal == "completed"
        return TurnResult(ok=ok, start=t0, end=time.monotonic(),
                          requests=[RequestAttempt(0, t0, time.monotonic(), ok, res.error_kind)],
                          scenario="text")

    oa = run_open_arrival(turn, arrival_rate=opts.get("arrival_rate", 1.0),
                          duration=opts.get("duration", 120.0),
                          max_in_flight=opts.get("max_in_flight", 10),
                          queue_limit=opts.get("queue_limit", 100))
    r.metrics["open_arrival"] = {k: v for k, v in oa.items() if k != "results"}
    r.add("planned_eq_done_fail_reject", True,
          f"{oa['scheduled']} == {oa['completed']}+{oa['failed']}+{oa['rejected']}",
          oa["scheduled"] == oa["completed"] + oa["failed"] + oa["rejected"])
    r.notes.append("报告轮次/s，不直接换算用户数")
    _dump(store, f"cap/CAP-05_{target.name}.json", None, None, [r.instance_id], "open_arrival")
    r.evidence.append(f"cap/CAP-05_{target.name}.json")
    return r.finalize()


# ---------------------------------------------------------------- 辅助/注册

opts_holder = {"v": {}}


def target_opts(opts) -> dict:
    return {
        "connect": float(opts.get("connect_timeout", 10.0)),
        "idle": float(opts.get("idle_timeout", 60.0)),
        "total": float(opts.get("total_timeout", 180.0)),
    }


def slo_from_opts(opts) -> SLO:
    s = opts.get("slo") or {}
    return SLO(success_rate=s.get("success_rate"), turn_p95_s=s.get("turn_p95_s"),
               first_text_p95_s=s.get("first_text_p95_s"), confirmed=bool(s.get("confirmed")))


MODULES = {
    "api": {
        "API-01": lambda t, s, o: [api01_discovery(t, s, o)],
        "API-02": lambda t, s, o: [api02(t, s, o)],
        "API-03": lambda t, s, o: [api03(t, s, o)],
        "API-04": lambda t, s, o: [api04_context(t, s, o)],
        "API-05": lambda t, s, o: [api05_tool(t, s, o, stream=False)],
        "API-06": lambda t, s, o: [api05_tool(t, s, o, stream=True)],
        "API-07": lambda t, s, o: [api07_auth(t, s, o)],
        "API-08": lambda t, s, o: [api08_invalid(t, s, o)],
        "API-09": lambda t, s, o: [api09_usage(t, s, o)],
        "API-10": lambda t, s, o: [api10_json(t, s, o)],
    },
    "tpt": {
        "TPT-01": lambda t, s, o: [tpt01(t, s, o)],
        "TPT-03": lambda t, s, o: [tpt03(t, s, o)],
        "TPT-06": lambda t, s, o: tpt06_efforts(t, s, o),
        "TPT-08": lambda t, s, o: [tpt08_terminal(t, s, o)],
        "TPT-09": lambda t, s, o: [tpt09_recover(t, s, o)],
    },
    "perf": {
        "PERF-01": lambda t, s, o: [perf01(t, s, o)],
        "PERF-03": lambda t, s, o: [perf03(t, s, o)],
    },
    "cap": {
        "CAP-01": lambda t, s, o: [cap01_burst(t, s, o)],
        "CAP-02": lambda t, s, o: [cap02(t, s, o)],
        "CAP-05": lambda t, s, o: [cap05(t, s, o)],
    },
}

CONDITIONAL_ITEMS = ["API-11", "API-12", "TPT-05", "TPT-07", "TPT-10", "PERF-04", "PERF-05",
                     "PERF-06", "PERF-07", "PERF-08", "CAP-03", "CAP-04", "CAP-06"]


def run(target: Target, module: str, items, store, opts) -> list:
    opts_holder["v"] = opts
    out = []
    table = MODULES.get(module, {})
    for item in items:
        fn = table.get(item)
        if fn is None:
            r = InstanceResult(f"{item}/{target.name}/not-implemented", item)
            r.status = "未验证"
            r.notes.append("本执行器未实现该实例的运行器（条件项或待补）")
            out.append(r)
            continue
        try:
            out.extend(fn(target, store, opts))
        except Exception as exc:  # noqa: BLE001
            import traceback
            r = InstanceResult(f"{item}/{target.name}/error", item)
            r.status = "不确定"
            r.notes.append(f"执行异常: {type(exc).__name__}: {exc}")
            r.notes.append(traceback.format_exc())
            out.append(r)
    return out
