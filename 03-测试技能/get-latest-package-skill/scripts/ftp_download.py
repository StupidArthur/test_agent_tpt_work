#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 FTP/FTPS 下载构建包：列目录 / 选最新 / 下载 / 校验。

配置优先级（后者覆盖前者）：配置文件 < 环境变量 < 命令行参数。
用法见同目录 ../SKILL.md。密码只从本地配置/环境变量读取，不写入输出。
"""
import argparse
from datetime import datetime
import hashlib
import json
import os
import re
import sys
from ftplib import FTP, FTP_TLS, error_perm, all_errors

# 保证中文/JSON 输出在 Windows 控制台按 UTF-8 显示，避免证据乱码。
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

ENV_MAP = {
    "host": "FTP_HOST",
    "port": "FTP_PORT",
    "user": "FTP_USER",
    "password": "FTP_PASSWORD",
    "tls": "FTP_TLS",
    "remote_dir": "FTP_REMOTE_DIR",
    "pattern": "FTP_PATTERN",
    "timestamp_pattern": "FTP_TIMESTAMP_PATTERN",
    "timestamp_format": "FTP_TIMESTAMP_FORMAT",
    "local_dir": "FTP_LOCAL_DIR",
    "timeout": "FTP_TIMEOUT",
}

DEFAULTS = {
    "host": None,
    "port": 21,
    "user": "anonymous",
    "password": "",
    "tls": False,
    "remote_dir": "/",
    "pattern": r"tpt-work-.+-win-x64\.exe",
    "timestamp_pattern": r"(?<!\d)(?P<timestamp>\d{14}|\d{12}|\d{8})(?!\d)",
    "timestamp_format": "auto",
    "local_dir": ".",
    "timeout": 30,
}


def log(msg):
    print(msg, file=sys.stderr)


def load_config(args):
    cfg = dict(DEFAULTS)
    path = args.config or os.environ.get("FTP_CONFIG")
    if path:
        if not os.path.isfile(path):
            raise SystemExit("配置文件不存在: %s" % path)
        with open(path, "r", encoding="utf-8") as fh:
            cfg.update(json.load(fh))
    for key, env in ENV_MAP.items():
        if os.environ.get(env) not in (None, ""):
            val = os.environ[env]
            if key == "port":
                val = int(val)
            elif key == "tls":
                val = str(val).lower() in ("1", "true", "yes", "on")
            elif key == "timeout":
                val = float(val)
            cfg[key] = val
    cli = {
        "host": args.host, "port": args.port, "user": args.user,
        "password": args.password, "tls": args.tls, "remote_dir": args.remote_dir,
        "timestamp_pattern": args.timestamp_pattern, "timestamp_format": args.timestamp_format,
        "pattern": args.pattern, "local_dir": args.local_dir, "timeout": args.timeout,
    }
    for key, val in cli.items():
        if val is not None:
            cfg[key] = val
    if not cfg["host"]:
        raise SystemExit("缺少 FTP 主机：用 --host、配置文件或 FTP_HOST 提供")
    return cfg


def connect(cfg):
    timeout = float(cfg.get("timeout") or 30)
    if cfg.get("tls"):
        ftp = FTP_TLS(timeout=timeout)
        ftp.connect(cfg["host"], int(cfg["port"]))
        ftp.auth()
        ftp.login(cfg["user"], cfg["password"])
        ftp.prot_p()
    else:
        ftp = FTP(timeout=timeout)
        ftp.connect(cfg["host"], int(cfg["port"]))
        ftp.login(cfg["user"], cfg["password"])
    ftp.set_pasv(True)
    return ftp


def listing(ftp, remote_dir):
    """返回 [(name, size or None)]。优先 MLSD 取事实，退化到 NLST+SIZE。"""
    ftp.cwd(remote_dir)
    items = []
    try:
        for name, facts in ftp.mlsd():
            if facts.get("type") in ("file", None):
                if facts.get("type") == "dir":
                    continue
                try:
                    size = int(facts.get("size")) if facts.get("size") else None
                except ValueError:
                    size = None
                items.append((name, size))
        if items:
            return items
    except (error_perm, AttributeError, all_errors):
        pass
    names = ftp.nlst()
    for name in names:
        try:
            size = ftp.size(name)
        except all_errors:
            size = None
        items.append((os.path.basename(name), size))
    return items


def sort_key(name, timestamp_pattern=DEFAULTS["timestamp_pattern"], timestamp_format="auto"):
    matches = list(re.finditer(timestamp_pattern, name))
    if len(matches) != 1:
        raise ValueError("Expected one unambiguous time tag: " + name)
    match = matches[0]
    if "timestamp" not in match.re.groupindex:
        raise ValueError("timestamp_pattern requires named group (?P<timestamp>...)")
    stamp = match.group("timestamp")
    fmt = timestamp_format
    if fmt == "auto":
        fmt = {8: "%Y%m%d", 12: "%Y%m%d%H%M", 14: "%Y%m%d%H%M%S"}.get(len(stamp or ""))
        if not fmt or not stamp.isascii() or not stamp.isdigit():
            raise ValueError("Configure timestamp_format for this time tag: " + name)
    value = datetime.strptime(stamp, fmt)
    if value.strftime(fmt) != stamp:
        raise ValueError("Time tag does not exactly match timestamp_format: " + name)
    return value


def pick_latest(items, pattern, timestamp_pattern=DEFAULTS["timestamp_pattern"], timestamp_format="auto"):
    rx = re.compile(pattern)
    matches = [(name, size, sort_key(name, timestamp_pattern, timestamp_format))
               for name, size in items if rx.fullmatch(name)]
    if not matches:
        return None
    newest = max(stamp for _, _, stamp in matches)
    winners = {name: size for name, size, stamp in matches if stamp == newest}
    if len(winners) != 1:
        raise ValueError("Ambiguous latest build; select --file: " + ", ".join(sorted(winners)))
    return next(iter(winners.items()))


def sha256_of(path, chunk=1024 * 1024):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(chunk), b""):
            h.update(block)
    return h.hexdigest()


def download(ftp, remote_file, local_dir, remote_dir):
    os.makedirs(local_dir, exist_ok=True)
    dest = os.path.join(local_dir, remote_file)
    part = dest + ".part"
    ftp.cwd(remote_dir)
    with open(part, "wb") as fh:
        ftp.retrbinary("RETR %s" % remote_file, fh.write)
    if os.path.exists(dest):
        os.remove(dest)
    os.rename(part, dest)
    return dest


def main(argv=None):
    ap = argparse.ArgumentParser(description="FTP 包下载（列目录/取最新/下载/校验）")
    ap.add_argument("action", choices=["list", "latest", "download"], nargs="?", default="download")
    ap.add_argument("--config")
    ap.add_argument("--host"); ap.add_argument("--port", type=int)
    ap.add_argument("--user"); ap.add_argument("--password")
    ap.add_argument("--tls", dest="tls", action="store_true", default=None)
    ap.add_argument("--remote-dir"); ap.add_argument("--pattern")
    ap.add_argument("--timestamp-pattern", help="Regex with named group timestamp")
    ap.add_argument("--timestamp-format", help="auto or Python datetime format")
    ap.add_argument("--local-dir"); ap.add_argument("--timeout", type=float)
    ap.add_argument("--file", help="指定远端文件名（默认取最新匹配）")
    ap.add_argument("--sha256", help="期望 SHA-256，不一致即失败")
    ap.add_argument("--reuse", action="store_true", help="本地已有同大小包则复用")
    args = ap.parse_args(argv)

    cfg = load_config(args)
    result = {"action": args.action, "remote_dir": cfg["remote_dir"], "pattern": cfg["pattern"]}

    ftp = connect(cfg)
    try:
        items = listing(ftp, cfg["remote_dir"])
        result["candidate_count"] = len(items)
        if args.action in ("list", "latest"):
            rx = re.compile(cfg["pattern"])
            matches = sorted([it for it in items if rx.fullmatch(it[0])],
                             key=lambda it: sort_key(it[0], cfg["timestamp_pattern"], cfg["timestamp_format"]), reverse=True)
            result["candidates"] = [{"name": n, "size": s} for n, s in matches]
            if args.action == "latest":
                latest = pick_latest(items, cfg["pattern"], cfg["timestamp_pattern"], cfg["timestamp_format"])
                result["latest"] = latest[0] if latest else None
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0

        target = args.file
        expected_size = None
        if not target:
            latest = pick_latest(items, cfg["pattern"], cfg["timestamp_pattern"], cfg["timestamp_format"])
            if not latest:
                log("未找到匹配 %s 的文件" % cfg["pattern"])
                result["error"] = "no-match"
                print(json.dumps(result, ensure_ascii=False, indent=2))
                return 1
            target, expected_size = latest
        else:
            for n, s in items:
                if n == target:
                    expected_size = s
                    break

        dest = os.path.join(cfg["local_dir"], target)
        reused = False
        if args.reuse and os.path.isfile(dest) and expected_size is not None \
                and os.path.getsize(dest) == expected_size:
            reused = True
            log("复用本地同大小包: %s" % dest)
        else:
            log("下载 %s -> %s" % (target, cfg["local_dir"]))
            dest = download(ftp, target, cfg["local_dir"], cfg["remote_dir"])
    finally:
        try:
            ftp.quit()
        except Exception:
            ftp.close()

    actual_size = os.path.getsize(dest)
    digest = sha256_of(dest)
    result.update({
        "remote_file": target,
        "local_path": dest,
        "size": actual_size,
        "sha256": digest.upper(),
        "reused": reused,
        "expected_size": expected_size,
        "size_match": (expected_size is None) or (actual_size == expected_size),
        "verified": (args.sha256 is None and ((expected_size is None) or actual_size == expected_size))
                    or (args.sha256 is not None and digest.lower() == args.sha256.lower()),
    })
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["verified"] else 2


if __name__ == "__main__":
    sys.exit(main())
