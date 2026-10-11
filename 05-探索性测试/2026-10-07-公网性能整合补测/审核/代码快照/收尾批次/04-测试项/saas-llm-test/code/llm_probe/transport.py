"""HTTP / SSE 传输层：鉴权、路径、超时、取消、帧解析、原始证据、时间点。

统一使用 http.client，以便：
- 精确记录“响应头到达”时间点；
- 逐块读取并按 SSE 增量解析；
- 区分连接超时 / 读空闲超时 / 整请求超时。
"""
from __future__ import annotations

import http.client
import json
import socket
import ssl
import time
import urllib.parse
from dataclasses import dataclass, field
from typing import Optional

from .sse import SSEDecoder, Frame


@dataclass
class RawFrame:
    t: float          # 相对 t0 的秒（单调）
    event: Optional[str]
    data: str
    raw: str
    is_done: bool = False
    json_ok: Optional[bool] = None
    json_obj: object = None
    json_error: Optional[str] = None


@dataclass
class TransportResult:
    ok: bool                       # 传输层是否正常读完成（不代表业务成功）
    http_status: Optional[int] = None
    headers: dict = field(default_factory=dict)
    frames: list[RawFrame] = field(default_factory=list)
    body_text: str = ""            # 非流式或错误响应体
    body_bytes_len: int = 0
    t0: float = 0.0
    t_headers: Optional[float] = None
    t_first_frame: Optional[float] = None
    t_end: Optional[float] = None
    error: Optional[str] = None
    error_kind: Optional[str] = None   # connect/dns/tls/read_idle/total/other
    closed_by_client: bool = False
    is_event_stream: bool = False

    def rel(self, t: Optional[float]) -> Optional[float]:
        if t is None:
            return None
        return round(t - self.t0, 6)


def _split_url(url: str):
    p = urllib.parse.urlsplit(url)
    scheme = p.scheme.lower()
    host = p.hostname
    port = p.port
    path = p.path or "/"
    if p.query:
        path += "?" + p.query
    return scheme, host, port, path


def http_request(
    url: str,
    *,
    method: str = "GET",
    headers: Optional[dict] = None,
    body: Optional[bytes] = None,
    connect_timeout: float = 10.0,
    idle_timeout: float = 60.0,
    total_timeout: float = 180.0,
    stream: bool = True,
    max_body_bytes: int = 8 * 1024 * 1024,
    cancel_check=None,
) -> TransportResult:
    """发一次请求并读取。失败/超时也会返回 TransportResult（带 error_kind）。"""
    res = TransportResult(ok=False)
    t0 = time.monotonic()
    res.t0 = t0
    scheme, host, port, path = _split_url(url)
    conn = None
    try:
        if scheme == "https":
            ctx = ssl.create_default_context()
            conn = http.client.HTTPSConnection(host, port or 443, timeout=connect_timeout, context=ctx)
        elif scheme == "http":
            conn = http.client.HTTPConnection(host, port or 80, timeout=connect_timeout)
        else:
            raise ValueError(f"unsupported scheme: {scheme}")
        conn.connect()
        conn.sock.settimeout(idle_timeout)
        hdrs = dict(headers or {})
        conn.putrequest(method, path, skip_host=False, skip_accept_encoding=True)
        for k, v in hdrs.items():
            conn.putheader(k, v)
        if body is not None:
            conn.putheader("Content-Length", str(len(body)))
        conn.endheaders(body)
        resp = conn.getresponse()
        res.t_headers = time.monotonic()
        res.http_status = resp.status
        res.headers = {k: v for k, v in resp.getheaders()}
        ctype = (res.headers.get("Content-Type") or res.headers.get("content-type") or "").lower()
        res.is_event_stream = "text/event-stream" in ctype

        if stream and res.is_event_stream:
            dec = SSEDecoder()
            while True:
                if cancel_check is not None and cancel_check():
                    res.closed_by_client = True
                    res.error_kind = "cancel"
                    break
                if time.monotonic() - t0 > total_timeout:
                    res.error_kind = "total_timeout"
                    res.error = f"total_timeout>{total_timeout}s"
                    break
                try:
                    chunk = resp.read1(4096)
                except socket.timeout:
                    res.error_kind = "read_idle_timeout"
                    res.error = f"read_idle>{idle_timeout}s"
                    break
                if not chunk:
                    break
                res.body_bytes_len += len(chunk)
                for fr in dec.feed(chunk):
                    rf = RawFrame(t=time.monotonic(), event=fr.event, data=fr.data,
                                  raw=fr.raw, is_done=fr.is_done, json_ok=fr.json_ok,
                                  json_obj=fr.json_obj, json_error=fr.json_error)
                    if res.t_first_frame is None:
                        res.t_first_frame = rf.t
                    res.frames.append(rf)
                if res.body_bytes_len > max_body_bytes:
                    res.error_kind = "body_too_large"
                    res.error = f"body>{max_body_bytes} bytes"
                    break
            for fr in dec.flush():
                rf = RawFrame(t=time.monotonic(), event=fr.event, data=fr.data, raw=fr.raw,
                              is_done=fr.is_done, json_ok=fr.json_ok, json_obj=fr.json_obj,
                              json_error=fr.json_error)
                if res.t_first_frame is None:
                    res.t_first_frame = rf.t
                res.frames.append(rf)
        else:
            # 非流式 / 非 SSE：整体读
            data = resp.read()
            res.body_bytes_len = len(data)
            res.body_text = data.decode("utf-8", errors="replace")

        res.t_end = time.monotonic()
        res.ok = res.error_kind is None
        return res
    except socket.gaierror as exc:
        res.error_kind = "dns"
        res.error = f"gaierror: {exc}"
    except ssl.SSLError as exc:
        res.error_kind = "tls"
        res.error = f"tls: {exc}"
    except (ConnectionRefusedError, ConnectionResetError, OSError) as exc:
        res.error_kind = "connect"
        res.error = f"{type(exc).__name__}: {exc}"
    except http.client.HTTPException as exc:
        res.error_kind = "http"
        res.error = f"{type(exc).__name__}: {exc}"
    except Exception as exc:  # noqa: BLE001
        res.error_kind = "other"
        res.error = f"{type(exc).__name__}: {exc}"
    res.t_end = time.monotonic()
    return res


def http_json(url: str, *, method="GET", headers=None, body=None,
              connect_timeout=10.0, idle_timeout=60.0, total_timeout=120.0) -> TransportResult:
    r = http_request(url, method=method, headers=headers, body=body,
                     connect_timeout=connect_timeout, idle_timeout=idle_timeout,
                     total_timeout=total_timeout, stream=False)
    return r
