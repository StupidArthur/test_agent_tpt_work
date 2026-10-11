"""本地可控 HTTP/SSE 服务，用于执行器离线验证（不接触真实网关）。

每个场景通过路径选择：GET/POST http://127.0.0.1:<port>/mock/<scenario>
"""
from __future__ import annotations

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def _frame(event: str, obj, *, crlf: bool = False) -> bytes:
    data = obj if isinstance(obj, str) else json.dumps(obj, ensure_ascii=False)
    eol = "\r\n" if crlf else "\n"
    return f"event: {event}{eol}data: {data}{eol}{eol}".encode("utf-8")


def _raw(data: bytes) -> bytes:
    return data


SCENARIOS = {}


def scenario(fn):
    SCENARIOS[fn.__name__] = fn
    return fn


@scenario
def ok_responses(_req):
    """首事件 → 推理 → 正文；含注释、CRLF、多行 data、中文跨分片、两帧共用一次写入。"""
    out = []
    # 1) 先到：非正文事件（output_item.added，reasoning item），CRLF
    out.append(("sleep", 0.0))
    out.append(("bytes", _frame("response.output_item.added",
                                {"type": "response.output_item.added", "output_index": 0,
                                 "item": {"id": "rs_1", "type": "reasoning"}}, crlf=True)))
    out.append(("sleep", 0.05))
    # 2) 推理增量（中文，故意跨分片）
    frame = _frame("response.reasoning_text.delta",
                   {"type": "response.reasoning_text.delta", "item_id": "rs_1",
                    "output_index": 0, "delta": "思考中"})
    half = len(frame) // 2
    out.append(("bytes", frame[:half]))
    out.append(("sleep", 0.01))
    out.append(("bytes", frame[half:]))
    out.append(("sleep", 0.05))
    # 3) 注释行 + 正文增量（multi-line data 合法 JSON）
    out.append(("bytes", b": keep-alive\n\n"))
    out.append(("sleep", 0.01))
    out.append(("bytes", _frame("response.output_text.delta",
                                {"type": "response.output_text.delta", "item_id": "msg_1",
                                 "output_index": 1, "delta": "GW_CHECK_"})))
    out.append(("sleep", 0.05))
    # 两帧共用一次写入 + 多行 data
    two = (b'event: response.output_text.delta\ndata: {"type":"response.output_text.delta",\n'
           b'data: "delta":"7c91"}\n\n')
    out.append(("bytes", two))
    out.append(("sleep", 0.02))
    # 4) message item done（最终正文）
    out.append(("bytes", _frame("response.output_item.done",
                                {"type": "response.output_item.done", "output_index": 1,
                                 "item": {"id": "msg_1", "type": "message",
                                          "content": [{"type": "output_text", "text": "GW_CHECK_7c91"}]}})))
    # 5) completed + usage
    out.append(("bytes", _frame("response.completed",
                                {"type": "response.completed",
                                 "response": {"id": "resp_1", "status": "completed",
                                              "usage": {"input_tokens": 12, "output_tokens": 5,
                                                        "total_tokens": 17}}})))
    return out


@scenario
def tool_split(_req):
    """工具参数分片 + 两个 call；第二个的最终参数与增量不一致。"""
    out = []
    out.append(("bytes", _frame("response.output_item.added",
                                {"type": "response.output_item.added", "output_index": 0,
                                 "item": {"id": "fc_1", "type": "function_call",
                                          "call_id": "call_1", "name": "add_numbers"}})))
    out.append(("bytes", _frame("response.function_call_arguments.delta",
                                {"type": "response.function_call_arguments.delta",
                                 "item_id": "fc_1", "output_index": 0, "delta": '{"a":17,'})))
    out.append(("sleep", 0.02))
    out.append(("bytes", _frame("response.function_call_arguments.delta",
                                {"type": "response.function_call_arguments.delta",
                                 "item_id": "fc_1", "output_index": 0, "delta": '"b":25}'})))
    out.append(("bytes", _frame("response.output_item.done",
                                {"type": "response.output_item.done", "output_index": 0,
                                 "item": {"id": "fc_1", "type": "function_call",
                                          "call_id": "call_1", "name": "add_numbers",
                                          "arguments": '{"a":17,"b":25}'}})))
    # 第二个 call：final 与增量不一致
    out.append(("bytes", _frame("response.output_item.added",
                                {"type": "response.output_item.added", "output_index": 1,
                                 "item": {"id": "fc_2", "type": "function_call",
                                          "call_id": "call_2", "name": "add_numbers"}})))
    out.append(("bytes", _frame("response.function_call_arguments.delta",
                                {"type": "response.function_call_arguments.delta",
                                 "item_id": "fc_2", "output_index": 1, "delta": '{"a":1,"b":2}'})))
    out.append(("bytes", _frame("response.output_item.done",
                                {"type": "response.output_item.done", "output_index": 1,
                                 "item": {"id": "fc_2", "type": "function_call",
                                          "call_id": "call_2", "name": "add_numbers",
                                          "arguments": '{"a":1,"b":3}'}})))
    out.append(("bytes", _frame("response.completed",
                                {"type": "response.completed", "response": {"status": "completed",
                                                                            "usage": {"input_tokens": 9, "output_tokens": 7, "total_tokens": 16}}})))
    return out


@scenario
def inline_error_200(_req):
    out = [
        ("bytes", _frame("response.output_text.delta",
                         {"type": "response.output_text.delta", "delta": "partial"})),
        ("sleep", 0.02),
        ("bytes", _frame("error", {"type": "error", "message": "upstream failed", "code": "UPSTREAM"})),
    ]
    return out


@scenario
def eof_no_terminal(_req):
    return [
        ("bytes", _frame("response.output_text.delta",
                         {"type": "response.output_text.delta", "delta": "partial"})),
        ("sleep", 0.02),
    ]


@scenario
def bad_json_then_ok(_req):
    return [
        ("bytes", b'event: response.output_text.delta\ndata: {not json\n\n'),
        ("bytes", _frame("response.output_text.delta",
                         {"type": "response.output_text.delta", "delta": "GW_CHECK_7c91"})),
        ("bytes", _frame("response.completed",
                         {"type": "response.completed", "response": {"status": "completed",
                                                                     "usage": {"input_tokens": 3, "output_tokens": 2, "total_tokens": 5}}})),
    ]


@scenario
def usage_missing(_req):
    return [
        ("bytes", _frame("response.output_text.delta",
                         {"type": "response.output_text.delta", "delta": "GW_CHECK_7c91"})),
        ("bytes", _frame("response.completed",
                         {"type": "response.completed", "response": {"status": "completed"}})),
    ]


@scenario
def chat_ok(_req):
    out = []
    out.append(("bytes", b'data: {"choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n'))
    out.append(("bytes", b'data: {"choices":[{"index":0,"delta":{"content":"GW_CHECK_"},"finish_reason":null}]}\n\n'))
    out.append(("bytes", b'data: {"choices":[{"index":0,"delta":{"content":"7c91"},"finish_reason":null}]}\n\n'))
    out.append(("bytes", b'data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":4,"completion_tokens":3,"total_tokens":7}}\n\n'))
    out.append(("bytes", b'data: [DONE]\n\n'))
    return out


@scenario
def slow_read(_req):
    return [
        ("bytes", _frame("response.output_text.delta",
                         {"type": "response.output_text.delta", "delta": "start"})),
        ("sleep", 3.0),  # 超过客户端 idle 超时
    ]


@scenario
def models_ok(_req):
    return [("json", {"data": [
        {"id": "ds-flash", "model_name": {"zh": "轻量", "en": "flash"}, "is_default": True,
         "context_window": 256000, "max_output_tokens": 32000,
         "modalities": {"input": ["text"]}, "supports_think": True,
         "think_levels": ["off", "low", "medium", "high"]},
        {"id": "qwen-flash", "model_name": {"zh": "高级", "en": "pro"},
         "context_window": 128000, "max_output_tokens": 8000,
         "modalities": {"input": ["text", "image"]}, "supports_think": True,
         "think_levels": ["off", "low", "medium", "high", "xhigh"]},
    ]})]


STATUS_SCENARIOS = {
    "http_401": (401, {"error": {"message": "missing api key", "type": "auth_error"}}, {}),
    "http_403": (403, {"error": {"message": "forbidden"}}, {}),
    "http_429": (429, {"error": {"message": "rate limited"}}, {"Retry-After": "3"}),
    "http_500": (500, "<html>internal error</html>", {}),
    "http_503": (503, {"error": {"message": "service unavailable"}}, {}),
}


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):  # 静音
        pass

    def _scenario(self):
        path = self.path.split("?")[0]
        if path.startswith("/mock/"):
            return path[len("/mock/"):]
        return None

    def do_GET(self):
        self._handle()

    def do_POST(self):
        cl = int(self.headers.get("Content-Length") or 0)
        if cl:
            self.rfile.read(cl)
        self._handle()

    def _handle(self):
        name = self._scenario()
        if name in STATUS_SCENARIOS:
            status, body, extra = STATUS_SCENARIOS[name]
            b = body if isinstance(body, str) else json.dumps(body, ensure_ascii=False)
            raw = b.encode("utf-8")
            self.send_response(status)
            for k, v in extra.items():
                self.send_header(k, v)
            if isinstance(body, str):
                self.send_header("Content-Type", "text/html; charset=utf-8")
            else:
                self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(raw)
            self.close_connection = True
            return

        if name == "models_ok":
            for kind, payload in SCENARIOS["models_ok"](None):
                raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(raw)))
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(raw)
            self.close_connection = True
            return

        fn = SCENARIOS.get(name)
        if fn is None:
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(b'{"error":{"message":"no such scenario"}}')
            self.close_connection = True
            return

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self.end_headers()
        try:
            for step in fn(None):
                if step[0] == "sleep":
                    time.sleep(step[1])
                else:
                    self.wfile.write(step[1])
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        self.close_connection = True


def serve(port: int = 0):
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    th = threading.Thread(target=srv.serve_forever, daemon=True)
    th.start()
    return srv


if __name__ == "__main__":
    import sys
    p = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    s = serve(p)
    print(f"mock server on http://127.0.0.1:{s.server_address[1]}  scenarios={sorted(SCENARIOS) + sorted(STATUS_SCENARIOS)}")
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        s.shutdown()
