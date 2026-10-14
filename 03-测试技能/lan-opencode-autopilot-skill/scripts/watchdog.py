#!/usr/bin/env python3
"""Wake a dedicated master OpenCode session periodically; do not schedule worker jobs here.

Python 3.11+. Uses the existing LAN skill's occtl.py as a version-compatible client.
A failed/ambiguous hand-off blocks, rather than blindly repeating side effects.
"""
from __future__ import annotations

import argparse
import contextlib
import datetime as dt
import json
import os
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path
from urllib.parse import urlsplit

UTC = dt.timezone.utc


class GuardError(RuntimeError):
    pass


def stamp():
    return dt.datetime.now(UTC).isoformat(timespec="seconds")


def load_config(path):
    path = Path(path).resolve(strict=True)
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    required = ("project_dir", "current_state", "master_server", "occtl")
    for key in required:
        if not isinstance(data.get(key), str) or not data[key]:
            raise GuardError(f"配置缺少 {key}")
    def absolute(value):
        p = Path(value)
        return (p if p.is_absolute() else path.parent / p).resolve()
    data["project_dir"] = absolute(data["project_dir"])
    data["current_state"] = absolute(data["current_state"])
    data["occtl"] = absolute(data["occtl"])
    data["runtime_dir"] = absolute(data.get("runtime_dir", ".ocautopilot"))
    data["interval_seconds"] = int(data.get("interval_seconds", 60))
    data["timeout_seconds"] = int(data.get("timeout_seconds", 30))
    if not (10 <= data["interval_seconds"] <= 86400):
        raise GuardError("interval_seconds 必须在 10-86400 之间")
    if not (5 <= data["timeout_seconds"] <= 300):
        raise GuardError("timeout_seconds 必须在 5-300 之间")
    url = urlsplit(data["master_server"])
    if (url.scheme != "http" or url.hostname != "127.0.0.1" or not url.port
            or url.path not in ("", "/") or url.query or url.fragment
            or url.username or url.password):
        raise GuardError("主控服务器必须绑定 http://127.0.0.1:PORT，不允许远端/URL 密码")
    if not data["project_dir"].is_dir() or not data["current_state"].is_file():
        raise GuardError("project_dir 必须存在，current_state.md 必须由用户先创建")
    if not data["occtl"].is_file():
        raise GuardError("无法找到现有 lan-opencode-manage-skill 的 occtl.py")
    if not (os.environ.get("OCCTL_PASSWORD") or os.environ.get("OPENCODE_SERVER_PASSWORD")):
        raise GuardError("主控服务必须设置认证；为启动者和 watchdog 配置同一密码环境变量")
    data["runtime_dir"].mkdir(parents=True, exist_ok=True)
    return data


def save_json(path, obj):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=".state-", dir=path.parent, text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def record(cfg, event, **details):
    path = cfg["runtime_dir"] / "actions.jsonl"
    line = json.dumps({"time": stamp(), "event": event, **details}, ensure_ascii=False)
    with path.open("a", encoding="utf-8") as f:
        f.write(line + "\n")
        f.flush()
        os.fsync(f.fileno())


@contextlib.contextmanager
def exclusive(path):
    """Single owner across watchdog processes. Keep FD open for process lifetime."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a+b") as f:
        if os.name == "nt":
            import msvcrt
            f.seek(0)
            f.write(b"0")
            f.flush()
            f.seek(0)
            try:
                msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError as exc:
                raise GuardError("已有 watchdog 正在运行，禁止并发唤醒") from exc
        else:
            import fcntl
            try:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError as exc:
                raise GuardError("已有 watchdog 正在运行，禁止并发唤醒") from exc
        try:
            yield
        finally:
            if os.name == "nt":
                f.seek(0)
                msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)


def execute(cfg, *args):
    command = [sys.executable, str(cfg["occtl"]), "--server",
               cfg["master_server"], "--json", *args]
    try:
        p = subprocess.run(command, cwd=cfg["project_dir"], text=True,
                           encoding="utf-8", errors="replace",
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                           timeout=cfg["timeout_seconds"], check=False)
    except subprocess.TimeoutExpired as exc:
        raise GuardError(f"occtl 超时: {args[0]}") from exc
    if p.returncode != 0:
        # The stderr may contain remote tool output. Do not persist it into state files.
        raise GuardError(f"occtl {args[0]} 退出码 {p.returncode}；请检查本机受控日志")
    try:
        return json.loads(p.stdout)
    except ValueError as exc:
        raise GuardError(f"occtl {args[0]} 未返回有效 JSON") from exc


def path_state(cfg):
    return cfg["runtime_dir"] / "watchdog.json"


def read_state(cfg):
    path = path_state(cfg)
    if not path.exists():
        raise GuardError("尚未初始化，请先运行 init")
    state = json.loads(path.read_text(encoding="utf-8"))
    if state.get("version") != 1 or not state.get("session_id"):
        raise GuardError("watchdog.json 格式不正确")
    return state


def store(cfg, state, event, **details):
    save_json(path_state(cfg), state)
    record(cfg, event, session_id=state["session_id"],
           cycle_id=state.get("cycle_id"), **details)


def init(cfg):
    if path_state(cfg).exists():
        raise GuardError("主控会话已初始化；不会创建第二个主控会话")
    info = execute(cfg, "new", "--dir", str(cfg["project_dir"]),
                   "--title", "OpenCode Autopilot Manager", "--no-allow-all")
    sid = info.get("id") if isinstance(info, dict) else None
    if not sid:
        raise GuardError("创建主控会话没有返回 id；必须人工对账，不能盲目重试")
    state = {"version": 1, "session_id": sid, "phase": "idle",
             "cycle_id": None, "generation": 0, "last_completed": None}
    store(cfg, state, "init")
    return state


def live_activity(cfg):
    rows = execute(cfg, "ps")
    if (not isinstance(rows, list) or len(rows) != 1
            or not rows[0].get("online") or not isinstance(rows[0].get("active"), dict)):
        raise GuardError("无法可靠读取主控服务当前活动状态")
    return rows[0]["active"]


def flatten_text(message):
    """Supports both OpenCode V2 flat messages and {info,parts} shape."""
    info = message.get("info") or message
    parts = message.get("parts") or message.get("content") or info.get("content") or []
    chunks = [info.get("text", "")]
    for part in parts:
        if isinstance(part, dict) and part.get("type") == "text":
            chunks.append(part.get("text", ""))
    return "".join(x for x in chunks if isinstance(x, str))


def finished_cycle(messages, cycle_id):
    """Must find this cycle's user prompt followed by a completed assistant."""
    if not isinstance(messages, list):
        return False
    marker = "autopilot-cycle:" + cycle_id
    start = -1
    for index, msg in enumerate(messages):
        info = msg.get("info") or msg
        if info.get("role", info.get("type")) == "user" and marker in flatten_text(msg):
            start = index
    if start < 0:
        return False
    for msg in messages[start + 1:]:
        info = msg.get("info") or msg
        if info.get("role", info.get("type")) == "assistant":
            return info.get("finish") == "stop"
    return False


def wake_prompt(cfg, cycle_id):
    state = cfg["current_state"]
    return (
        f"autopilot-cycle:{cycle_id}\n"
        "这是无人值守主控的一个管理周期；必须严格使用 lan-opencode-manage-skill。\n"
        f"1. 首先读取状态文件 {state}（不得只凭会话记忆）。\n"
        "2. 根据文件中管理的 PC 清单，逐台执行 occtl ps / messages 等实查；"
        "文件状态不是远端事实，无法确认时不能重复派单。\n"
        "3. 依据已授权的任务和 Git 闸门，执行必要的派工、验收、返修或通知；"
        "禁止绕过权限或凭旧 outcome 宣告成功。\n"
        "4. 为每次有副作用的派工保留 jobId、PC、sessionID 及操作记录；"
        "如果状态不明，标记待对账，不得盲目再提交。\n"
        "5. 原子更新 current_state.md（同目录临时文件后替换），明确各 PC 最新"
        "实查状态、本轮动作、下一步；原始 actions.jsonl/证据不覆盖。\n"
        f"6. 本轮结束，简要输出 autopilot-cycle:{cycle_id} 的结论。"
    )


def tick(cfg):
    state = read_state(cfg)
    if state["phase"] == "blocked":
        return {"phase": "blocked", "reason": state.get("reason")}
    active = live_activity(cfg)
    sid = state["session_id"]

    if state["phase"] in ("sending", "running"):
        if sid in active:
            if state["phase"] != "running":
                state["phase"] = "running"
                store(cfg, state, "observed_running")
            return {"phase": "running", "cycle_id": state["cycle_id"]}
        # If the previous handoff was ambiguous, reconcile by the unique cycle marker.
        msgs = execute(cfg, "messages", sid, "--limit", "100", "--order", "desc")
        if isinstance(msgs, list):
            msgs.reverse()  # Most recent 100, now chronological for completion matching.
        if not finished_cycle(msgs, state["cycle_id"]):
            state["phase"] = "blocked"
            state["reason"] = "未能确认该周期的用户消息与最新 assistant 已完成；禁止重复派单"
            store(cfg, state, "uncertain_handoff")
            return {"phase": "blocked", "reason": state["reason"]}
        if cfg["current_state"].stat().st_mtime_ns <= state.get("state_mtime_ns", 0):
            state["phase"] = "blocked"
            state["reason"] = "主控会话已结束，但 current_state.md 未被更新"
            store(cfg, state, "state_not_updated")
            return {"phase": "blocked", "reason": state["reason"]}
        state.update(phase="idle", last_completed=state["cycle_id"], cycle_id=None)
        store(cfg, state, "cycle_finished")
        return {"phase": "idle", "last_completed": state["last_completed"]}

    if state["phase"] != "idle":
        raise GuardError("非法调度状态，拒绝唤醒")
    if active:
        return {"phase": "busy", "active_sessions": len(active)}
    cycle_id = str(uuid.uuid4())
    state.update(phase="sending", cycle_id=cycle_id,
                 generation=state["generation"] + 1,
                 state_mtime_ns=cfg["current_state"].stat().st_mtime_ns,
                 dispatched_at=stamp())
    store(cfg, state, "before_dispatch")
    try:
        accepted = execute(cfg, "run", "--session", sid, "--detach",
                           "--require-idle", wake_prompt(cfg, cycle_id))
        if not isinstance(accepted, dict) or accepted.get("status") != "dispatched":
            raise GuardError("主控没有明确确认接收周期")
    except Exception as exc:
        state["phase"] = "blocked"
        state["reason"] = "派发结果不确定，需人工对账后再解锁"
        store(cfg, state, "dispatch_uncertain", error_type=type(exc).__name__)
        return {"phase": "blocked", "reason": state["reason"]}
    state["phase"] = "running"
    store(cfg, state, "dispatched", message_id=accepted.get("messageID"))
    return {"phase": "running", "cycle_id": cycle_id}


def main(argv=None):
    p = argparse.ArgumentParser(description="OpenCode Autopilot wakeup watchdog")
    p.add_argument("--config", required=True)
    sub = p.add_subparsers(dest="action", required=True)
    for action in ("init", "once", "run", "status"):
        sub.add_parser(action)
    clear = sub.add_parser("unblock")
    clear.add_argument("--reason", required=True)
    clear.add_argument("--confirmed", action="store_true")
    args = p.parse_args(argv)
    try:
        cfg = load_config(args.config)
        if args.action == "status":
            print(json.dumps(read_state(cfg), ensure_ascii=False, indent=2))
            return 0
        with exclusive(cfg["runtime_dir"] / "watchdog.lock"):
            if args.action == "init":
                print(json.dumps(init(cfg), ensure_ascii=False))
            elif args.action == "unblock":
                if not args.confirmed or len(args.reason.strip()) < 10:
                    raise GuardError("只有人工对账后，才能 --confirmed --reason 解除阻塞")
                state = read_state(cfg)
                if state["phase"] != "blocked":
                    raise GuardError("只有 blocked 状态允许手动解锁")
                if live_activity(cfg):
                    raise GuardError("主控仍有活跃会话，不可解锁")
                state.update(phase="idle", cycle_id=None, reason=None)
                store(cfg, state, "manual_unblock", reason=args.reason)
                print(json.dumps({"phase": "idle"}, ensure_ascii=False))
            elif args.action == "once":
                print(json.dumps(tick(cfg), ensure_ascii=False))
            else:
                while True:
                    try:
                        result = tick(cfg)
                        print(json.dumps({"time": stamp(), **result},
                                         ensure_ascii=False), flush=True)
                    except (GuardError, OSError, ValueError) as exc:
                        print(f"[watchdog] {stamp()}: {exc}", file=sys.stderr,
                              flush=True)
                    time.sleep(cfg["interval_seconds"])
        return 0
    except (GuardError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"[watchdog] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
