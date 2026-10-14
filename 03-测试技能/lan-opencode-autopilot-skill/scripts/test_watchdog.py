"""Mocked controller tests. Never connects to a real OpenCode or model provider."""
import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "watchdog", Path(__file__).with_name("watchdog.py"))
wd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wd)


class TestWatchdog(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        (root / "current_state.md").write_text("# Test state\n", encoding="utf-8")
        (root / "occtl.py").write_text("# stub\n", encoding="utf-8")
        self.cfg = {
            "project_dir": root, "current_state": root / "current_state.md",
            "master_server": "http://127.0.0.1:4097",
            "occtl": root / "occtl.py", "runtime_dir": root / ".ocautopilot",
            "interval_seconds": 60, "timeout_seconds": 30,
        }
        self.cfg["runtime_dir"].mkdir()

    def initialise(self):
        with patch.object(wd, "execute", return_value={"id": "master1"}) as run:
            state = wd.init(self.cfg)
        self.assertEqual(state["session_id"], "master1")
        self.assertIn("--no-allow-all", run.call_args.args)
        return state

    def test_init_preserves_existing_session(self):
        self.initialise()
        with self.assertRaises(wd.GuardError):
            wd.init(self.cfg)

    def test_first_cycle_stores_intent_before_send(self):
        self.initialise()
        def fake(cfg, *args):
            if args[0] == "ps":
                return [{"online": True, "active": {}}]
            self.assertEqual(args[0], "run")
            self.assertEqual(wd.read_state(cfg)["phase"], "sending")
            self.assertIn("--require-idle", args)
            self.assertIn("autopilot-cycle:", args[-1])
            self.assertIn(str(cfg["current_state"]), args[-1])
            return {"status": "dispatched", "sessionID": "master1", "messageID": "msg1"}
        with patch.object(wd, "execute", side_effect=fake) as sent:
            result = wd.tick(self.cfg)
        self.assertEqual(result["phase"], "running")
        self.assertEqual(wd.read_state(self.cfg)["generation"], 1)
        self.assertEqual(sent.call_count, 2)

    def test_running_does_not_dispatch_again(self):
        s = self.initialise()
        s.update(phase="running", cycle_id="cycle1")
        wd.save_json(wd.path_state(self.cfg), s)
        with patch.object(wd, "execute", return_value=[
            {"online": True, "active": {"master1": {}}}]) as calls:
            r = wd.tick(self.cfg)
        self.assertEqual(r["phase"], "running")
        self.assertEqual(calls.call_count, 1)

    def test_reconcile_completed_cycle(self):
        s = self.initialise()
        s.update(phase="running", cycle_id="cycle1", state_mtime_ns=0)
        wd.save_json(wd.path_state(self.cfg), s)
        messages = [
            {"type": "assistant", "finish": "stop", "content": [{"type": "text", "text": "ok"}]},
            {"type": "user", "text": "autopilot-cycle:cycle1"},
        ]  # simulated API order=desc
        def fake(cfg, *args):
            if args[0] == "ps":
                return [{"online": True, "active": {}}]
            return messages
        with patch.object(wd, "execute", side_effect=fake):
            r = wd.tick(self.cfg)
        self.assertEqual(r["phase"], "idle")
        self.assertEqual(wd.read_state(self.cfg)["last_completed"], "cycle1")

    def test_unknown_handoff_fails_closed(self):
        s = self.initialise()
        s.update(phase="sending", cycle_id="cycle1", state_mtime_ns=0)
        wd.save_json(wd.path_state(self.cfg), s)
        def fake(cfg, *args):
            return [{"online": True, "active": {}}] if args[0] == "ps" else []
        with patch.object(wd, "execute", side_effect=fake) as call:
            r = wd.tick(self.cfg)
            other = wd.tick(self.cfg)
        self.assertEqual(r["phase"], "blocked")
        self.assertEqual(other["phase"], "blocked")
        self.assertEqual(call.call_count, 2)  # only ps + messages first time

    def test_completed_without_state_file_change_is_blocked(self):
        s = self.initialise()
        s.update(phase="running", cycle_id="cycle1",
                 state_mtime_ns=self.cfg["current_state"].stat().st_mtime_ns)
        wd.save_json(wd.path_state(self.cfg), s)
        messages = [
            {"type": "assistant", "finish": "stop"},
            {"type": "user", "text": "autopilot-cycle:cycle1"},
        ]
        def fake(cfg, *args):
            return [{"online": True, "active": {}}] if args[0] == "ps" else messages
        with patch.object(wd, "execute", side_effect=fake):
            r = wd.tick(self.cfg)
        self.assertEqual(r["phase"], "blocked")

    def test_message_normalization(self):
        items = [
            {"info": {"role": "user"}, "parts": [{"type": "text", "text": "autopilot-cycle:X"}]},
            {"info": {"role": "assistant", "finish": "stop"}, "parts": []},
        ]
        self.assertTrue(wd.finished_cycle(items, "X"))
        self.assertFalse(wd.finished_cycle(items, "Y"))

    def test_single_owner_lock(self):
        lock = self.cfg["runtime_dir"] / "lock"
        with wd.exclusive(lock):
            with self.assertRaises(wd.GuardError):
                with wd.exclusive(lock):
                    pass

    def test_rejects_insecure_server(self):
        configfile = Path(self.tmp.name) / "config.json"
        c = dict(self.cfg)
        c["project_dir"] = str(c["project_dir"])
        c["current_state"] = str(c["current_state"])
        c["occtl"] = str(c["occtl"])
        c["runtime_dir"] = str(c["runtime_dir"])
        c["master_server"] = "http://192.168.1.88:4097"
        configfile.write_text(json.dumps(c), encoding="utf-8")
        with patch.dict(os.environ, {"OCCTL_PASSWORD": "test"}):
            with self.assertRaises(wd.GuardError):
                wd.load_config(configfile)

    def test_send_failure_blocks(self):
        self.initialise()
        def fake(cfg, *args):
            if args[0] == "ps":
                return [{"online": True, "active": {}}]
            raise wd.GuardError("simulated network break")
        with patch.object(wd, "execute", side_effect=fake):
            r = wd.tick(self.cfg)
        self.assertEqual(r["phase"], "blocked")
        self.assertIn("派发结果不确定", wd.read_state(self.cfg)["reason"])


if __name__ == "__main__":
    unittest.main()
