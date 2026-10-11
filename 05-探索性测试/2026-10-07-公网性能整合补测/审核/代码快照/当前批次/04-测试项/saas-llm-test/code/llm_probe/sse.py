"""SSE 帧解析（纯函数 + 增量解码）。

设计约束（来自 04-执行器与交付约定 / 02-测试方法）：
- 按 SSE 帧解析，而不是每个 TCP 块当一个事件；
- 处理 CRLF、空行分帧、注释、多个 data: 行、跨块 UTF-8、未知事件、JSON 解析失败；
- 原始字节/帧与解析输出同时留证。
"""
from __future__ import annotations

import codecs
import json
from dataclasses import dataclass, field
from typing import Iterable, Optional


@dataclass
class Frame:
    """一个已完整的 SSE 帧。"""
    event: Optional[str]          # event: 字段（缺省 None）
    data: str                     # 多行 data 以 \n 连接
    raw: str                      # 该帧原始文本（不含结尾空行）
    is_done: bool = False         # data == [DONE]
    comment_only: bool = False
    json_ok: Optional[bool] = None
    json_obj: object = None
    json_error: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "event": self.event,
            "data": self.data,
            "raw": self.raw,
            "is_done": self.is_done,
            "comment_only": self.comment_only,
            "json_ok": self.json_ok,
            "json_error": self.json_error,
        }


def _find_frame_end(buf: str):
    """返回 (index, sep_len)：最早出现的空行分隔。没有则 (None, 0)。"""
    best = None
    for sep in ("\r\n\r\n", "\n\n", "\r\r"):
        i = buf.find(sep)
        if i != -1:
            if best is None or i < best[0]:
                best = (i, len(sep))
    if best is None:
        return None, 0
    return best


def parse_frame(raw: str) -> Frame:
    """解析单帧文本（不含结尾空行）。"""
    lines = raw.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    event = None
    data_lines: list[str] = []
    had_field = False
    for line in lines:
        if line == "":
            continue
        if line.startswith(":"):
            # 注释行，忽略但记录其存在
            had_field = True
            continue
        if ":" in line:
            fname, value = line.split(":", 1)
            if value.startswith(" "):
                value = value[1:]
        else:
            fname, value = line, ""
        had_field = True
        if fname == "event":
            event = value
        elif fname == "data":
            data_lines.append(value)
        # id: / retry: / 其它字段忽略
    data = "\n".join(data_lines)
    fr = Frame(
        event=event,
        data=data,
        raw=raw,
        is_done=(data.strip() == "[DONE]"),
        comment_only=had_field and not data_lines and event is None,
    )
    if data and not fr.is_done:
        try:
            fr.json_obj = json.loads(data)
            fr.json_ok = True
        except Exception as exc:  # noqa: BLE001 - 保留原始错误文本
            fr.json_ok = False
            fr.json_error = f"{type(exc).__name__}: {exc}"
    return fr


class SSEDecoder:
    """增量解码器：喂 bytes，产出完整 Frame。跨块 UTF-8 安全。"""

    def __init__(self) -> None:
        self._dec = codecs.getincrementaldecoder("utf-8")(errors="replace")
        self._buf = ""

    def feed(self, chunk: bytes) -> list[Frame]:
        self._buf += self._dec.decode(chunk)
        out: list[Frame] = []
        while True:
            idx, sep_len = _find_frame_end(self._buf)
            if idx is None:
                break
            raw = self._buf[:idx]
            self._buf = self._buf[idx + sep_len:]
            out.append(parse_frame(raw))
        return out

    def flush(self) -> list[Frame]:
        """流结束。返回缓冲区里未以空行结尾的残留帧（EOF 无终态时有用）。"""
        self._buf += self._dec.decode(b"", final=True)
        out: list[Frame] = []
        if self._buf.strip():
            out.append(parse_frame(self._buf))
        self._buf = ""
        return out

    @property
    def pending(self) -> str:
        return self._buf
