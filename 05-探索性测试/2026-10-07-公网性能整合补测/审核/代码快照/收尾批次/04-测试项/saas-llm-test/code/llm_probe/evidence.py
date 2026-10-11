"""证据落盘：原始请求/响应、SHA-256、证据索引、凭据脱敏。"""
from __future__ import annotations

import hashlib
import json
import os
import re
import threading
from typing import Iterable, Optional

_SECRET_RE = re.compile(r"(sk-[A-Za-z0-9_\-]{6,})")


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest().upper()


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for blk in iter(lambda: f.read(65536), b""):
            h.update(blk)
    return h.hexdigest().upper()


def redact(text: str) -> str:
    """移除疑似密钥。仅用于证据/日志；不改变真实请求头。"""
    return _SECRET_RE.sub(lambda m: m.group(1)[:6] + "..." + m.group(1)[-4:], text)


class EvidenceStore:
    """把证据写入目录并在 jsonl 索引里登记 SHA-256。

    只移除凭据；保留完整请求参数与正文/工具参数。
    """

    def __init__(self, root: str, index_path: Optional[str] = None, prefix: str = "") -> None:
        self.root = root
        if index_path is None:
            index_path = os.path.join(os.path.dirname(root.rstrip("\\/")), "证据索引.jsonl")
        self.index_path = index_path
        self.prefix = prefix
        os.makedirs(root, exist_ok=True)
        self._lock = threading.Lock()

    def write(self, rel_path: str, data, *, instances: Iterable[str], kind: str,
              note: str = "", binary: bool = False) -> dict:
        abspath = os.path.join(self.root, rel_path)
        if self.prefix:
            rel_path = os.path.join(self.prefix, rel_path)
            abspath = os.path.join(self.root, rel_path)
        os.makedirs(os.path.dirname(abspath), exist_ok=True)
        # 不静默覆盖：同名证据自动加修订序号，保留历史 attempt
        if os.path.exists(abspath):
            base, ext = os.path.splitext(rel_path)
            n = 2
            while os.path.exists(os.path.join(self.root, f"{base}__r{n}{ext}")):
                n += 1
            rel_path = f"{base}__r{n}{ext}"
            abspath = os.path.join(self.root, rel_path)
        if binary:
            assert isinstance(data, (bytes, bytearray))
            with open(abspath, "wb") as f:
                f.write(data)
        else:
            if not isinstance(data, str):
                data = json.dumps(data, ensure_ascii=False, indent=2)
            data = redact(data)
            with open(abspath, "w", encoding="utf-8", newline="\n") as f:
                f.write(data)
        digest = sha256_file(abspath)
        rec = {
            "rel_path": rel_path.replace(os.sep, "/"),
            "sha256": digest,
            "instances": list(instances),
            "kind": kind,
            "note": note,
        }
        with self._lock:
            with open(self.index_path, "a", encoding="utf-8", newline="\n") as f:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        return rec

    def write_json(self, rel_path: str, obj, *, instances, kind, note="") -> dict:
        return self.write(rel_path, obj, instances=instances, kind=kind, note=note)
