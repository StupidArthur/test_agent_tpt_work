"""协议与场景：Responses / Chat 请求构造与事件归一化。"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Optional

from .transport import RawFrame, TransportResult

CHECK_MARK = "GW_CHECK_7c91"


# ---------------------------------------------------------------- 请求构造

def responses_body(model: str, *, text: Optional[str] = None, input_items=None,
                   instructions: Optional[str] = None, stream: bool = True,
                   max_output_tokens: Optional[int] = None, tools=None,
                   reasoning_effort: Optional[str] = None,
                   tool_choice: Optional[str] = None, temperature=None) -> dict:
    """构造 TPT Work 原生 Responses 请求体。可选字段缺省不发键。"""
    if input_items is None:
        input_items = [{"role": "user", "content": [{"type": "input_text", "text": text or ""}]}]
    body: dict = {"model": model, "input": input_items, "stream": stream}
    if instructions is not None:
        body["instructions"] = instructions
    if max_output_tokens is not None:
        body["max_output_tokens"] = max_output_tokens
    if tools is not None:
        body["tools"] = tools
    if tool_choice is not None:
        body["tool_choice"] = tool_choice
    if temperature is not None:
        body["temperature"] = temperature
    if reasoning_effort is not None:
        body["reasoning"] = {"effort": reasoning_effort}
    return body


def add_numbers_tool() -> dict:
    """平铺 Responses function 定义。"""
    return {
        "type": "function",
        "name": "add_numbers",
        "description": "Add two integers and return the sum.",
        "parameters": {
            "type": "object",
            "properties": {"a": {"type": "integer"}, "b": {"type": "integer"}},
            "required": ["a", "b"],
        },
    }


def chat_body(model: str, *, messages, stream: bool = True,
              max_tokens: Optional[int] = None, tools=None, tool_choice=None,
              include_usage: bool = False, response_format=None,
              extra_fields: Optional[dict] = None) -> dict:
    body: dict = {"model": model, "messages": messages, "stream": stream}
    if max_tokens is not None:
        body["max_tokens"] = max_tokens
    if tools is not None:
        body["tools"] = tools
    if tool_choice is not None:
        body["tool_choice"] = tool_choice
    if include_usage:
        body["stream_options"] = {"include_usage": True}
    if response_format is not None:
        body["response_format"] = response_format
    if extra_fields:
        body.update(extra_fields)
    return body


# ---------------------------------------------------------------- 归一化

@dataclass
class ToolCall:
    key: str                      # 聚合键（item_id / index）
    call_id: Optional[str] = None
    name: Optional[str] = None
    arg_deltas: list[str] = field(default_factory=list)
    final_arguments: Optional[str] = None
    output_index: Optional[int] = None
    item_id: Optional[str] = None

    @property
    def arguments(self) -> str:
        return "".join(self.arg_deltas)

    def to_dict(self) -> dict:
        d = {
            "key": self.key,
            "call_id": self.call_id,
            "name": self.name,
            "arguments_from_deltas": self.arguments,
            "final_arguments": self.final_arguments,
            "output_index": self.output_index,
            "item_id": self.item_id,
        }
        d["delta_matches_final"] = (
            None if self.final_arguments is None else (self.arguments == self.final_arguments)
        )
        return d


@dataclass
class NormalizedStream:
    protocol: str
    text: str = ""
    reasoning: str = ""
    final_text: Optional[str] = None
    tool_calls: dict = field(default_factory=dict)   # key -> ToolCall
    usage: Optional[dict] = None
    terminal: Optional[str] = None        # completed / incomplete / failed / error
    terminal_reason: Optional[str] = None
    error_message: Optional[str] = None
    unknown_events: list = field(default_factory=list)
    json_errors: list = field(default_factory=list)
    t_first_event: Optional[float] = None
    t_first_reasoning: Optional[float] = None
    t_first_text: Optional[float] = None
    t_first_tool: Optional[float] = None
    t_terminal: Optional[float] = None

    def tool_list(self) -> list:
        return [tc.to_dict() for tc in self.tool_calls.values()]

    def to_dict(self) -> dict:
        return {
            "protocol": self.protocol,
            "text": self.text,
            "reasoning": self.reasoning,
            "final_text": self.final_text,
            "tool_calls": self.tool_list(),
            "usage": self.usage,
            "terminal": self.terminal,
            "terminal_reason": self.terminal_reason,
            "error_message": self.error_message,
            "unknown_events": self.unknown_events,
            "json_errors": self.json_errors,
        }


_KNOWN_RESPONSES = {
    "response.output_item.added", "response.output_item.done",
    "response.output_text.delta", "response.reasoning_text.delta",
    "response.reasoning_summary_text.delta",
    "response.function_call_arguments.delta",
    "response.function_call_arguments.done",
    "response.completed", "response.failed", "response.incomplete", "error",
}


def normalize_responses(res: TransportResult) -> NormalizedStream:
    ns = NormalizedStream(protocol="responses")
    for fr in res.frames:
        if ns.t_first_event is None:
            ns.t_first_event = fr.t
        if fr.json_ok is False:
            ns.json_errors.append({"event": fr.event, "data": fr.data, "error": fr.json_error})
        ev = fr.event or ""
        obj = fr.json_obj if isinstance(fr.json_obj, dict) else {}
        if ev not in _KNOWN_RESPONSES and not fr.is_done:
            if not fr.raw.strip().startswith(":") and fr.raw.strip():
                ns.unknown_events.append({"event": fr.event, "data": fr.data[:200]})

        if ev == "response.output_text.delta":
            d = obj.get("delta", "")
            if d:
                ns.text += d
                if ns.t_first_text is None:
                    ns.t_first_text = fr.t
        elif ev in ("response.reasoning_text.delta", "response.reasoning_summary_text.delta"):
            d = obj.get("delta", "")
            if d:
                ns.reasoning += d
                if ns.t_first_reasoning is None:
                    ns.t_first_reasoning = fr.t
        elif ev == "response.output_item.added":
            item = obj.get("item") or {}
            if item.get("type") == "function_call":
                key = item.get("id") or f"idx{obj.get('output_index')}"
                tc = ns.tool_calls.setdefault(key, ToolCall(key=key))
                tc.call_id = item.get("call_id") or tc.call_id
                tc.name = item.get("name") or tc.name
                tc.item_id = item.get("id")
                tc.output_index = obj.get("output_index")
        elif ev == "response.function_call_arguments.delta":
            key = obj.get("item_id") or f"idx{obj.get('output_index')}"
            tc = ns.tool_calls.setdefault(key, ToolCall(key=key))
            tc.item_id = tc.item_id or obj.get("item_id")
            tc.output_index = obj.get("output_index", tc.output_index)
            d = obj.get("delta", "")
            if d:
                tc.arg_deltas.append(d)
                if ns.t_first_tool is None:
                    ns.t_first_tool = fr.t
        elif ev == "response.function_call_arguments.done":
            key = obj.get("item_id") or f"idx{obj.get('output_index')}"
            tc = ns.tool_calls.setdefault(key, ToolCall(key=key))
            tc.final_arguments = obj.get("arguments", tc.final_arguments)
            if ns.t_first_tool is None:
                ns.t_first_tool = fr.t
        elif ev == "response.output_item.done":
            item = obj.get("item") or {}
            if item.get("type") == "function_call":
                key = item.get("id") or f"idx{obj.get('output_index')}"
                tc = ns.tool_calls.setdefault(key, ToolCall(key=key))
                tc.call_id = item.get("call_id") or tc.call_id
                tc.name = item.get("name") or tc.name
                if item.get("arguments") is not None:
                    tc.final_arguments = item.get("arguments")
            elif item.get("type") == "message":
                content = item.get("content") or []
                parts = [c.get("text", "") for c in content
                         if isinstance(c, dict) and c.get("type") == "output_text"]
                if parts:
                    ns.final_text = "".join(parts)
        elif ev == "response.completed":
            r = obj.get("response") or {}
            ns.terminal = "completed"
            ns.usage = r.get("usage") or ns.usage
            ns.terminal_reason = r.get("status")
            ns.t_terminal = ns.t_terminal or fr.t
        elif ev == "response.incomplete":
            r = obj.get("response") or {}
            ns.terminal = "incomplete"
            ns.usage = r.get("usage") or ns.usage
            inc = r.get("incomplete_details") or {}
            ns.terminal_reason = inc.get("reason") or r.get("status")
            ns.t_terminal = ns.t_terminal or fr.t
        elif ev in ("response.failed", "error"):
            r = obj.get("response") if ev == "response.failed" else None
            ns.terminal = "failed"
            if r:
                err = r.get("error") or {}
                ns.error_message = err.get("message") or json.dumps(err, ensure_ascii=False)
                ns.usage = r.get("usage") or ns.usage
            else:
                ns.error_message = obj.get("message") or fr.data[:500]
            ns.t_terminal = ns.t_terminal or fr.t
    return ns


def normalize_chat(res: TransportResult) -> NormalizedStream:
    ns = NormalizedStream(protocol="chat")
    saw_finish = False
    for fr in res.frames:
        if ns.t_first_event is None:
            ns.t_first_event = fr.t
        if fr.is_done:
            continue
        if fr.json_ok is False:
            ns.json_errors.append({"event": fr.event, "data": fr.data, "error": fr.json_error})
            continue
        obj = fr.json_obj
        if not isinstance(obj, dict):
            continue
        if obj.get("error"):
            ns.terminal = "failed"
            ns.error_message = json.dumps(obj["error"], ensure_ascii=False)
            ns.t_terminal = ns.t_terminal or fr.t
            continue
        if obj.get("usage"):
            ns.usage = obj["usage"]
        for ch in obj.get("choices") or []:
            delta = ch.get("delta") or {}
            content = delta.get("content")
            if content:
                ns.text += content
                if ns.t_first_text is None:
                    ns.t_first_text = fr.t
            rc = delta.get("reasoning_content")
            if rc:
                ns.reasoning += rc
                if ns.t_first_reasoning is None:
                    ns.t_first_reasoning = fr.t
            for tc in delta.get("tool_calls") or []:
                idx = tc.get("index", 0)
                key = tc.get("id") or f"idx{idx}"
                cur = ns.tool_calls.setdefault(key, ToolCall(key=key))
                if tc.get("id"):
                    cur.call_id = tc["id"]
                fn = tc.get("function") or {}
                if fn.get("name"):
                    cur.name = fn["name"]
                if fn.get("arguments"):
                    cur.arg_deltas.append(fn["arguments"])
                    if ns.t_first_tool is None:
                        ns.t_first_tool = fr.t
            if ch.get("finish_reason"):
                saw_finish = True
                ns.terminal_reason = ch["finish_reason"]
                if ch["finish_reason"] in ("tool_calls", "function_call"):
                    ns.terminal = "completed"
                elif ch["finish_reason"] == "length":
                    ns.terminal = "incomplete"
                elif ch["finish_reason"] in ("stop",):
                    ns.terminal = "completed"
                else:
                    ns.terminal = ns.terminal or "completed"
                ns.t_terminal = ns.t_terminal or fr.t
    if ns.terminal is None and saw_finish:
        ns.terminal = "completed"
    return ns


def normalize(res: TransportResult, protocol: str) -> NormalizedStream:
    return normalize_chat(res) if protocol == "chat" else normalize_responses(res)
