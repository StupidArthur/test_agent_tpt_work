#!/usr/bin/env python3
"""Codex LAN over app-server WebSocket. Python 3.11+, websockets>=14,<17."""
from __future__ import annotations
import argparse
import json
import os
import sys
import threading
import time
from pathlib import Path
from urllib.parse import urlsplit
try:
    from websockets.sync.client import connect
    from websockets.exceptions import WebSocketException, ConnectionClosed
except ImportError:
    connect = None
    WebSocketException = ConnectionClosed = OSError

SOURCES = ["cli", "vscode", "exec", "appServer", "subAgent", "subAgentReview",
           "subAgentCompact", "subAgentThreadSpawn", "subAgentOther", "unknown"]
CLIENT = {"name": "codex_lan_manage", "title": "Codex LAN Manager", "version": "0.1.0"}

class Error(Exception):
    def __init__(self, message, code=1):
        super().__init__(message)
        self.code = code

def object_json(text):
    try:
        data = json.loads(text)
    except ValueError as exc:
        raise Error(f"JSON 无效: {exc}") from exc
    if not isinstance(data, dict):
        raise Error("参数必须是 JSON 对象")
    return data

def load_params(args, prefix="params"):
    raw = getattr(args, prefix + "_json", None)
    path = getattr(args, prefix + "_file", None)
    if raw is not None and path is not None:
        raise Error(f"{prefix}：JSON 字符串与文件不可同时指定")
    if path:
        try:
            raw = Path(path).read_text(encoding="utf-8-sig")
        except OSError as exc:
            raise Error(f"无法读取参数文件: {exc}") from exc
    return object_json(raw) if raw is not None else {}

def find_registry(args):
    if args.servers:
        return Path(args.servers).expanduser()
    if os.environ.get("CODEXCTL_SERVERS"):
        return Path(os.environ["CODEXCTL_SERVERS"]).expanduser()
    cwd = Path.cwd()
    for folder in (cwd, *cwd.parents):
        if (folder / ".lan-codex.json").exists() or (folder / ".git").exists():
            return folder / ".lan-codex.json"
    return cwd / ".lan-codex.json"

def entries(args):
    path = find_registry(args)
    try:
        data = object_json(path.read_text(encoding="utf-8-sig"))
    except FileNotFoundError as exc:
        raise Error(f"机器清单不存在: {path}") from exc
    mapping = data.get("servers", data)
    if not isinstance(mapping, dict) or not all(isinstance(x, dict) for x in mapping.values()):
        raise Error("servers 必须是名称到配置对象的映射")
    return mapping

def secure_url(url, token):
    try:
        p = urlsplit(url)
        if (p.scheme not in ("ws", "wss") or not p.hostname or p.username
            or p.password or p.query or p.fragment or p.path not in ("", "/")):
            raise Error("只允许没有 URL 凭据/路径的 ws(s)://HOST:PORT")
        local = p.hostname.lower() in ("localhost", "127.0.0.1", "::1")
        if p.scheme == "ws" and not local:
            raise Error("非回环地址禁止明文 ws://；请使用 SSH 转发或 TLS wss://")
        if not local and not token:
            raise Error("非本机连接必须配置 Bearer token")
        return url
    except ValueError as exc:
        raise Error(f"无效 WebSocket URL: {exc}") from exc

def resolve(args):
    name = args.server or os.environ.get("CODEXCTL_SERVER", "")
    if not name:
        raise Error("指定 --server PC88 / URL，或 CODEXCTL_SERVER")
    if name.startswith(("ws://", "wss://")):
        config = {"url": name}
    else:
        config = entries(args).get(name)
        if config is None:
            raise Error(f"机器不存在: {name}")
    envname = args.token_env or config.get("token_env", "CODEXCTL_TOKEN")
    if not isinstance(envname, str) or not envname.isidentifier():
        raise Error("token_env 应为环境变量名称，不是凭据原文")
    token = os.environ.get(envname, "")
    return secure_url(str(config.get("url", "")), token), token

def wire(ws, message):
    ws.send(json.dumps(message, ensure_ascii=False, separators=(",", ":")))

class Client:
    """Native protocol transport: accepts every RPC method and parameter object."""
    def __init__(self, url, token="", timeout=20, experimental=False, factory=None):
        self.url, self.token, self.timeout = secure_url(url, token), token, timeout
        self.experimental, self.factory = experimental, factory
        self.ws = None
        self.serial = 0
        self.events = []
        self.on_event = None
        self.on_request = None

    def __enter__(self):
        if self.factory is None and connect is None:
            raise Error("需要安装: py -3.11 -m pip install 'websockets>=14,<17'")
        headers = {"Authorization": "Bearer " + self.token} if self.token else None
        try:
            self.ws = (self.factory or connect)(
                self.url, additional_headers=headers,
                open_timeout=self.timeout, close_timeout=3)
            params = {"clientInfo": CLIENT}
            if self.experimental:
                params["capabilities"] = {"experimentalApi": True}
            self.call("initialize", params)
            self.notify("initialized", {})
        except Exception:
            if self.ws:
                self.ws.close()
            raise
        return self

    def __exit__(self, *_):
        if self.ws:
            self.ws.close()

    def receive(self, timeout=None):
        try:
            obj = json.loads(self.ws.recv(timeout=timeout))
            if not isinstance(obj, dict):
                raise Error("服务器消息不是 JSON 对象")
            return obj
        except TimeoutError:
            raise
        except (ConnectionClosed, OSError, WebSocketException) as exc:
            raise Error(f"WebSocket 连接断开: {exc}") from exc
        except ValueError as exc:
            raise Error(f"服务器 JSON 无效: {exc}") from exc

    def notify(self, method, params=None):
        frame = {"method": method}
        if params is not None:
            frame["params"] = params
        wire(self.ws, frame)

    def handle(self, msg):
        if "id" in msg and "method" in msg:
            reply = self.on_request(msg) if self.on_request else None
            if reply is None:
                wire(self.ws, {"id": msg["id"],
                               "error": {"code": -32601, "message": "No handler; request denied"}})
            else:
                wire(self.ws, {"id": msg["id"], "result": reply})
        elif self.on_event:
            self.on_event(msg)
        elif "method" in msg:
            self.events.append(msg)

    def call(self, method, params=None, timeout=None):
        self.serial += 1
        request_id = "codexctl-" + str(self.serial)
        msg = {"id": request_id, "method": method}
        if params is not None:
            msg["params"] = params
        wire(self.ws, msg)
        deadline = time.monotonic() + (timeout if timeout is not None else self.timeout)
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise Error(f"{method}: RPC 超时", 3)
            try:
                received = self.receive(timeout=remaining)
            except TimeoutError as exc:
                raise Error(f"{method}: RPC 超时", 3) from exc
            if received.get("id") == request_id and "method" not in received:
                if "error" in received:
                    raise Error(f"{method}: {received['error']}")
                return received.get("result")
            self.handle(received)

def all_threads(client, limit=None):
    cursor, visited = None, set()
    while True:
        p = {"sourceKinds": SOURCES, "limit": 100}
        if cursor:
            p["cursor"] = cursor
        result = client.call("thread/list", p)
        if not isinstance(result, dict) or not isinstance(result.get("data"), list):
            raise Error("thread/list 响应格式错误")
        for entry in result["data"]:
            yield entry
            if limit is not None:
                limit -= 1
                if limit <= 0:
                    return
        cursor = result.get("nextCursor")
        if not cursor:
            return
        if cursor in visited:
            raise Error("thread/list 游标循环")
        visited.add(cursor)

def active_threads(client):
    return [t for t in all_threads(client)
            if isinstance(t.get("status"), dict) and t["status"].get("type") == "active"]

def print_result(value, args):
    print(json.dumps(value, ensure_ascii=False, indent=None if args.json else 2))

def approvals(msg, mode="deny"):
    print("[server request] " + json.dumps(msg, ensure_ascii=False), file=sys.stderr)
    if mode == "manual" and sys.stdin.isatty():
        answer = input("请输入原生 JSON 结果对象（空行拒绝）：").strip()
        if answer:
            return object_json(answer)
    method = msg.get("method", "")
    if method in ("item/commandExecution/requestApproval", "item/fileChange/requestApproval"):
        return {"decision": "decline"}
    if method == "item/permissions/requestApproval":
        return {"permissions": {}}
    if method == "mcpServer/elicitation/request":
        return {"action": "decline", "content": None}
    return None

def run(client, args):
    client.on_request = lambda msg: approvals(msg, args.approvals)
    tp = load_params(args, "thread_params")
    vp = load_params(args, "turn_params")
    if args.thread:
        if tp:
            raise Error("续接线程不接受 thread-start 参数；可使用 rpc thread/resume")
        r = client.call("thread/resume", {"threadId": args.thread})
    else:
        if args.cwd:
            if "cwd" in tp and tp["cwd"] != args.cwd:
                raise Error("--cwd 与 thread_params.cwd 不一致")
            tp["cwd"] = args.cwd
        # Important: do not insert a default model, modelProvider or config.
        r = client.call("thread/start", tp)
    tid = (r or {}).get("thread", {}).get("id")
    if not tid:
        raise Error("服务器未返回 thread.id")
    if "input" in vp:
        raise Error("turn_params.input 与 task 冲突；需要完全原生输入请用 rpc")
    if vp.get("threadId", tid) != tid:
        raise Error("turn_params.threadId 冲突")
    vp.update({"threadId": tid, "input": [{"type": "text", "text": args.task}]})
    tr = client.call("turn/start", vp)
    turn = (tr or {}).get("turn", {})
    turnid = turn.get("id")
    if not turnid:
        raise Error("服务器未返回 turn.id")
    report = {"threadId": tid, "turnId": turnid, "status": turn.get("status")}
    if args.detach:
        print_result(report, args)
        return
    state = {"done": False, "status": report["status"], "text": []}
    def event(msg):
        p = msg.get("params") or {}
        if p.get("threadId") != tid:
            return
        if msg.get("method") == "item/agentMessage/delta" and p.get("turnId") == turnid:
            delta = p.get("delta")
            if isinstance(delta, str):
                state["text"].append(delta)
                if not args.json:
                    print(delta, end="", flush=True)
        if msg.get("method") == "turn/completed" and (p.get("turn") or {}).get("id") == turnid:
            state.update(done=True, status=p["turn"].get("status"))
    client.on_event = event
    for pending in client.events:
        event(pending)
    client.events.clear()
    end = time.monotonic() + args.timeout if args.timeout else None
    while not state["done"]:
        left = None if end is None else max(0.0, end - time.monotonic())
        if left == 0:
            raise Error(f"turn 超时但未中断: thread={tid} turn={turnid}", 3)
        try:
            client.handle(client.receive(timeout=left))
        except TimeoutError as exc:
            raise Error(f"turn 超时但未中断: thread={tid} turn={turnid}", 3) from exc
    report.update(status=state["status"], streamText="".join(state["text"]))
    if not args.json:
        print()
    print_result(report, args)
    if state["status"] != "completed":
        raise Error(f"turn 已结束: {state['status']}", 2)

def bridge(client):
    """Full duplex JSONL proxy: caller answers server-originated requests itself."""
    stop = threading.Event()
    def reader():
        while not stop.is_set():
            try:
                frame = client.receive(timeout=0.2)
            except TimeoutError:
                continue
            except Exception as exc:
                if not stop.is_set():
                    print(json.dumps({"bridgeError": str(exc)}, ensure_ascii=False), flush=True)
                break
            print(json.dumps(frame, ensure_ascii=False), flush=True)
        stop.set()
    worker = threading.Thread(target=reader, daemon=True)
    worker.start()
    try:
        for line in sys.stdin:
            if stop.is_set():
                break
            if not line.strip():
                continue
            frame = object_json(line)
            if frame.get("method") in ("initialize", "initialized"):
                raise Error("bridge 已完成握手，不能重复 initialize")
            wire(client.ws, frame)
    finally:
        stop.set()

def parser():
    p = argparse.ArgumentParser(description="Codex LAN controller; default remote model is inherited")
    p.add_argument("--server")
    p.add_argument("--servers")
    p.add_argument("--token-env")
    p.add_argument("--timeout-rpc", type=float, default=20)
    p.add_argument("--experimental", action="store_true")
    p.add_argument("--json", action="store_true")
    sub = p.add_subparsers(dest="command", required=True)
    sub.add_parser("servers")
    sub.add_parser("info")
    sub.add_parser("ps")
    ls = sub.add_parser("ls")
    ls.add_argument("--cwd")
    ls.add_argument("--limit", type=int, default=50)
    messages = sub.add_parser("messages")
    messages.add_argument("thread")
    interrupt = sub.add_parser("interrupt")
    interrupt.add_argument("thread")
    interrupt.add_argument("turn")
    rpc = sub.add_parser("rpc")
    rpc.add_argument("method")
    rpc.add_argument("--params-json")
    rpc.add_argument("--params-file")
    events = sub.add_parser("events")
    events.add_argument("--thread")
    events.add_argument("--timeout", type=float)
    events.add_argument("--max-events", type=int)
    events.add_argument("--approvals", choices=("deny", "manual"), default="deny")
    job = sub.add_parser("run")
    job.add_argument("task")
    job.add_argument("--cwd")
    job.add_argument("--thread")
    job.add_argument("--detach", action="store_true")
    job.add_argument("--require-idle", action="store_true")
    job.add_argument("--timeout", type=float)
    job.add_argument("--approvals", choices=("deny", "manual"), default="deny")
    job.add_argument("--thread-params-json")
    job.add_argument("--thread-params-file")
    job.add_argument("--turn-params-json")
    job.add_argument("--turn-params-file")
    sub.add_parser("bridge")
    return p

def main(argv=None, factory=None):
    args = parser().parse_args(argv)
    try:
        if args.command == "servers":
            print_result([{"name": n, "url": e.get("url"), "token_env": e.get("token_env", "CODEXCTL_TOKEN")}
                          for n, e in entries(args).items()], args)
            return 0
        if args.command == "ps" and not (args.server or os.environ.get("CODEXCTL_SERVER")):
            result = []
            for name in entries(args):
                subargs = argparse.Namespace(**vars(args))
                subargs.server = name
                try:
                    url, token = resolve(subargs)
                    with Client(url, token, args.timeout_rpc, args.experimental, factory) as remote:
                        result.append({"pc": name, "online": True, "active": active_threads(remote)})
                except (Error, OSError, WebSocketException) as exc:
                    result.append({"pc": name, "online": False, "error": str(exc)})
            print_result(result, args)
            return 0
        url, token = resolve(args)
        with Client(url, token, args.timeout_rpc, args.experimental, factory) as client:
            if args.command == "info":
                value = {"url": url, "initialized": True, "loaded": client.call("thread/loaded/list")}
                print_result(value, args)
            elif args.command == "ps":
                print_result(active_threads(client), args)
            elif args.command == "ls":
                print_result([x for x in all_threads(client, args.limit)
                              if not args.cwd or x.get("cwd") == args.cwd], args)
            elif args.command == "messages":
                print_result(client.call("thread/read", {"threadId": args.thread, "includeTurns": True}), args)
            elif args.command == "interrupt":
                print_result(client.call("turn/interrupt", {"threadId": args.thread, "turnId": args.turn}), args)
            elif args.command == "rpc":
                print_result(client.call(args.method, load_params(args)), args)
            elif args.command == "run":
                if args.require_idle and active_threads(client):
                    raise Error("目标机器存在 active 线程；拒绝派工（非原子并发锁）")
                run(client, args)
            elif args.command == "events":
                client.on_request = lambda msg: approvals(msg, args.approvals)
                client.on_event = lambda msg: print(json.dumps(msg, ensure_ascii=False), flush=True)
                if args.thread:
                    client.call("thread/resume", {"threadId": args.thread})
                deadline = time.monotonic() + args.timeout if args.timeout else None
                num = 0
                while deadline is None or time.monotonic() < deadline:
                    try:
                        client.handle(client.receive(
                            timeout=max(0, deadline - time.monotonic()) if deadline else None))
                    except TimeoutError:
                        break
                    num += 1
                    if args.max_events and num >= args.max_events:
                        break
            elif args.command == "bridge":
                bridge(client)
        return 0
    except Error as exc:
        print(str(exc), file=sys.stderr)
        return exc.code
    except (OSError, WebSocketException, ValueError) as exc:
        print(f"连接或协议错误: {exc}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
