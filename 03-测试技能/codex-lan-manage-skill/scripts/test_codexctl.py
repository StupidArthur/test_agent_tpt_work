"""Protocol tests for Codex LAN; no real Codex or provider credentials required."""
import importlib.util
import io
import json
import os
import tempfile
import unittest
from contextlib import redirect_stdout, redirect_stderr
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("codexctl", Path(__file__).with_name("codexctl.py"))
ctl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ctl)

class FakeSocket:
    def __init__(self, approval=False):
        self.sent, self.inbox = [], []
        self.approval = approval
        self.closed = False
        self.headers = None

    def send(self, raw):
        msg = json.loads(raw)
        self.sent.append(msg)
        method = msg.get("method")
        if "id" not in msg:
            return
        mid = msg["id"]
        if method == "initialize":
            self.inbox.append({"id": mid, "result": {"userAgent": "fake"}})
        elif method == "thread/start":
            self.inbox.extend([
                {"method": "thread/started", "params": {"thread": {"id": "thr1"}}},
                {"id": mid, "result": {"thread": {"id": "thr1"}}}
            ])
        elif method == "thread/resume":
            self.inbox.append({"id": mid, "result": {"thread": {"id": msg["params"]["threadId"]}}})
        elif method == "turn/start":
            self.inbox.append({"id": mid, "result": {"turn": {"id": "turn1", "status": "inProgress"}}})
            if self.approval:
                self.inbox.append({"id": 444, "method": "item/commandExecution/requestApproval",
                                   "params": {"threadId": "thr1", "turnId": "turn1"}})
            self.inbox.extend([
                {"method": "item/agentMessage/delta", "params": {"threadId": "thr1",
                                                                 "turnId": "turn1", "delta": "OK"}},
                {"method": "turn/completed", "params": {"threadId": "thr1",
                                                      "turn": {"id": "turn1", "status": "completed"}}},
            ])
        elif method == "thread/list":
            self.inbox.append({"id": mid, "result": {"data": [], "nextCursor": None}})
        elif method == "thread/loaded/list":
            self.inbox.append({"id": mid, "result": {"data": ["thr1"]}})
        else:
            self.inbox.append({"id": mid, "result": {"echo": msg.get("params")}})

    def recv(self, timeout=None):
        if self.inbox:
            return json.dumps(self.inbox.pop(0))
        raise TimeoutError()

    def close(self):
        self.closed = True

def factory_for(socket):
    def factory(url, **kwargs):
        socket.headers = kwargs.get("additional_headers")
        return socket
    return factory

class TestProtocol(unittest.TestCase):
    def call(self, sock, *args):
        with patch.dict(os.environ, {"CODEXCTL_TOKEN": "test-only"}):
            with redirect_stdout(io.StringIO()) as out, redirect_stderr(io.StringIO()) as err:
                exit_code = ctl.main(["--server", "ws://127.0.0.1:4500", *args],
                                     factory=factory_for(sock))
        return exit_code, out.getvalue(), err.getvalue()

    def test_handshake_and_raw_passthrough(self):
        sock = FakeSocket()
        code, out, err = self.call(sock, "rpc", "thread/start",
                                   "--params-json",
                                   '{"model":"custom","modelProvider":"provider",'
                                   '"config":{"x":null},"extra":[1,2]}')
        self.assertEqual(code, 0, err)
        self.assertEqual([x["method"] for x in sock.sent[:2]], ["initialize", "initialized"])
        self.assertEqual(sock.sent[-1]["params"]["extra"], [1, 2])
        self.assertIsNone(sock.sent[-1]["params"]["config"]["x"])
        self.assertEqual(sock.sent[-1]["params"]["modelProvider"], "provider")

    def test_default_run_no_model_injected(self):
        sock = FakeSocket()
        code, out, err = self.call(sock, "run", "--cwd", "D:/repo", "Read only inspection")
        self.assertEqual(code, 0, err)
        ts = next(x for x in sock.sent if x.get("method") == "thread/start")
        self.assertEqual(ts["params"], {"cwd": "D:/repo"})
        self.assertNotIn("modelProvider", ts["params"])
        tr = next(x for x in sock.sent if x.get("method") == "turn/start")
        self.assertEqual(tr["params"]["input"], [{"type": "text", "text": "Read only inspection"}])
        self.assertIn('"status": "completed"', out)

    def test_optional_model_and_policy_overrides(self):
        sock = FakeSocket()
        code, out, err = self.call(sock, "run", "--detach",
                                   "--thread-params-json",
                                   '{"model":"explicit","modelProvider":"other","approvalPolicy":"on-request"}',
                                   "--turn-params-json", '{"model":"different","effort":"high"}',
                                   "Check")
        self.assertEqual(code, 0, err)
        start = next(x for x in sock.sent if x.get("method") == "thread/start")
        turn = next(x for x in sock.sent if x.get("method") == "turn/start")
        self.assertEqual(start["params"]["modelProvider"], "other")
        self.assertEqual(turn["params"]["model"], "different")
        self.assertEqual(json.loads(out)["status"], "inProgress")

    def test_server_approval_declined_by_default(self):
        sock = FakeSocket(approval=True)
        code, _, err = self.call(sock, "run", "Check")
        self.assertEqual(code, 0, err)
        response = next(x for x in sock.sent if x.get("id") == 444)
        self.assertEqual(response["result"], {"decision": "decline"})

    def test_unknown_reverse_request_is_failed_closed(self):
        sock = FakeSocket()
        with ctl.Client("ws://127.0.0.1:4500", factory=factory_for(sock)) as c:
            c.on_request = lambda msg: ctl.approvals(msg)
            c.handle({"id": 999, "method": "future/serverRequest", "params": {}})
        reply = next(x for x in sock.sent if x.get("id") == 999)
        self.assertEqual(reply["error"]["code"], -32601)

    def test_security_rejects_insecure_direct_lan(self):
        with self.assertRaises(ctl.Error):
            ctl.secure_url("ws://192.168.1.88:4500", "tok")
        with self.assertRaises(ctl.Error):
            ctl.secure_url("wss://pc88.lan:4500", "")
        self.assertEqual(ctl.secure_url("wss://pc88.lan:4500", "tok"),
                         "wss://pc88.lan:4500")

    def test_registry_token_environment(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "servers.json"
            path.write_text(json.dumps({"servers": {
                "PC88": {"url": "wss://pc88.lan:4500", "token_env": "PC88_TOKEN"}}}))
            args = ctl.parser().parse_args(["--server", "PC88", "--servers", str(path), "info"])
            with patch.dict(os.environ, {"PC88_TOKEN": "secret"}):
                self.assertEqual(ctl.resolve(args), ("wss://pc88.lan:4500", "secret"))

    def test_require_idle_probes_status(self):
        sock = FakeSocket()
        code, _, err = self.call(sock, "run", "--detach", "--require-idle", "Test")
        self.assertEqual(code, 0, err)
        self.assertIn("thread/list", [x.get("method") for x in sock.sent])

class TestLiveWebSocket(unittest.TestCase):
    def test_real_local_websocket_transport(self):
        try:
            from websockets.sync.server import serve
        except ImportError:
            self.skipTest("websockets not installed")
        received = []
        def handler(sock):
            for raw in sock:
                msg = json.loads(raw)
                received.append(msg)
                if "id" not in msg:
                    continue
                if msg["method"] == "initialize":
                    sock.send(json.dumps({"id": msg["id"], "result": {}}))
                elif msg["method"] == "thread/loaded/list":
                    sock.send(json.dumps({"id": msg["id"], "result": {"data": []}}))
        with serve(handler, "127.0.0.1", 0) as server:
            port = server.socket.getsockname()[1]
            thr = __import__("threading").Thread(target=server.serve_forever, daemon=True)
            thr.start()
            try:
                with ctl.Client(f"ws://127.0.0.1:{port}") as client:
                    self.assertEqual(client.call("thread/loaded/list"), {"data": []})
                self.assertEqual([m["method"] for m in received],
                                 ["initialize", "initialized", "thread/loaded/list"])
            finally:
                server.shutdown()
                thr.join(timeout=2)

if __name__ == "__main__":
    unittest.main()
