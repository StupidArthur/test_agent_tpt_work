import base64
import hashlib
import hmac
import json
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import URLError
from urllib.parse import parse_qs, urlsplit

from dingtalk_webhook import DingTalkError, send_markdown

URL = "https://oapi.dingtalk.com/robot/send?access_token=test-token"


class SendTests(unittest.TestCase):
    def response(self, data):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = data
        return response

    @patch("dingtalk_webhook.urlopen")
    def test_payload_and_sign(self, opening):
        opening.return_value = self.response(b'{"errcode":0,"errmsg":"ok"}')
        with patch("dingtalk_webhook.time.time", return_value=1234.5):
            self.assertEqual(send_markdown("测试", "## 中文", URL, "test-secret")["errcode"], 0)
        request = opening.call_args.args[0]
        self.assertEqual(json.loads(request.data), {"msgtype": "markdown", "markdown": {"title": "测试", "text": "## 中文"}})
        query = parse_qs(urlsplit(request.full_url).query)
        expected = base64.b64encode(hmac.new(b"test-secret", b"1234500\ntest-secret", hashlib.sha256).digest()).decode()
        self.assertEqual(query["sign"], [expected])
        self.assertEqual(query["timestamp"], ["1234500"])
        self.assertEqual(request.get_method(), "POST")

    @patch("dingtalk_webhook.urlopen")
    def test_env_and_unsigned(self, opening):
        opening.return_value = self.response(b'{"errcode":0}')
        with patch.dict("os.environ", {"DINGTALK_WEBHOOK_URL": URL, "DINGTALK_WEBHOOK_SECRET": "unused"}):
            send_markdown("title", "text", secret="")
        self.assertNotIn("sign", parse_qs(urlsplit(opening.call_args.args[0].full_url).query))

    @patch("dingtalk_webhook.urlopen")
    def test_rejection_and_invalid_response(self, opening):
        for data in (b'{"errcode":310000}', b'{}', b'not-json'):
            opening.return_value = self.response(data)
            with self.assertRaises(DingTalkError):
                send_markdown("title", "text", URL, "")

    @patch("dingtalk_webhook.urlopen", side_effect=URLError(URL))
    def test_network_no_retry_no_secret_leak(self, opening):
        with self.assertRaises(DingTalkError) as caught:
            send_markdown("title", "text", URL, "")
        self.assertNotIn("test-token", str(caught.exception))
        self.assertEqual(opening.call_count, 1)

    def test_invalid_input(self):
        for url in ("", "http://oapi.dingtalk.com/robot/send?access_token=x", "https://example.com/?access_token=x"):
            with self.assertRaises(ValueError):
                send_markdown("title", "text", url, "")


if __name__ == "__main__":
    unittest.main()
