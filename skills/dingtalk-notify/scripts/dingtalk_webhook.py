"""Send Markdown through a DingTalk custom robot. No external dependencies."""

import base64
import hashlib
import hmac
import json
import os
import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen


class DingTalkError(RuntimeError):
    """A request failed or DingTalk rejected the message."""


def send_markdown(
    title: str,
    text: str,
    webhook_url: str | None = None,
    secret: str | None = None,
    timeout: float = 10,
) -> dict:
    """Send once; return a response with errcode=0, otherwise raise.

    None credentials fall back to DINGTALK_WEBHOOK_URL/SECRET.
    An empty secret explicitly disables signing. Network failures may have
    occurred after delivery, so callers should not blindly retry.
    """
    if not isinstance(title, str) or not title.strip():
        raise ValueError("title must be a non-empty string")
    if not isinstance(text, str) or not text.strip():
        raise ValueError("text must be a non-empty string")
    if not isinstance(timeout, (int, float)) or not 0 < timeout < float("inf"):
        raise ValueError("timeout must be a positive finite number")
    webhook_url = os.environ.get("DINGTALK_WEBHOOK_URL", "") if webhook_url is None else webhook_url
    secret = os.environ.get("DINGTALK_WEBHOOK_SECRET", "") if secret is None else secret
    if not isinstance(webhook_url, str) or not isinstance(secret, str):
        raise ValueError("webhook_url and secret must be strings")
    try:
        parts = urlsplit(webhook_url)
        valid = (parts.scheme == "https" and parts.hostname == "oapi.dingtalk.com"
                 and parts.port in (None, 443) and parts.path == "/robot/send"
                 and not parts.username and not parts.password and not parts.fragment)
        query = dict(parse_qsl(parts.query, keep_blank_values=True))
    except ValueError:
        raise ValueError("invalid DingTalk webhook URL") from None
    if not valid or not query.get("access_token"):
        raise ValueError("a DingTalk HTTPS robot webhook with access_token is required")
    # Replace stale signing parameters rather than carrying them forward.
    query.pop("timestamp", None)
    query.pop("sign", None)
    if secret:
        timestamp = str(int(time.time() * 1000))
        digest = hmac.new(secret.encode("utf-8"),
                          f"{timestamp}\n{secret}".encode("utf-8"),
                          hashlib.sha256).digest()
        query.update(timestamp=timestamp, sign=base64.b64encode(digest).decode("ascii"))
    url = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), ""))
    body = json.dumps({"msgtype": "markdown", "markdown": {"title": title, "text": text}},
                      ensure_ascii=False).encode("utf-8")
    request = Request(url, data=body, headers={"Content-Type": "application/json; charset=utf-8"}, method="POST")
    try:
        with urlopen(request, timeout=timeout) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        raise DingTalkError(f"DingTalk HTTP error {error.code}; delivery not confirmed") from None
    except (URLError, TimeoutError, OSError):
        raise DingTalkError("DingTalk network failure; delivery uncertain") from None
    except (ValueError, UnicodeError):
        raise DingTalkError("DingTalk returned an invalid JSON response; delivery not confirmed") from None
    if not isinstance(result, dict) or type(result.get("errcode")) is not int:
        raise DingTalkError("DingTalk response missing integer errcode; delivery not confirmed")
    if result["errcode"] != 0:
        # Avoid echoing a server message that could contain credentials.
        raise DingTalkError(f"DingTalk rejected message: errcode={result['errcode']}")
    return result
