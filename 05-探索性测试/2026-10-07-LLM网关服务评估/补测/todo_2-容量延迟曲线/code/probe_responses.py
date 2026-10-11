"""One Responses-API request via the canonical llm_probe modules, to confirm URL/body/parse."""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]  # repo root D:\code\electron-ui
sys.path.insert(0, str(ROOT / '04-测试项/saas-llm-test/code'))
from llm_probe import protocol, transport  # noqa: E402

cfg = json.loads((ROOT / '04-测试项/saas-llm-test/archive/v1/llm-bench-kit/config.json').read_text(encoding='utf-8'))
t = next(x for x in cfg['targets'] if x['name'] == 'flash-public-low')
url = t['base_url'].rstrip('/') + '/responses'
marker = 'CAP_smoke0001'
body = protocol.responses_body('flash', text=f'只输出 {marker}', stream=True,
                               max_output_tokens=256, reasoning_effort='low')
raw = json.dumps(body, ensure_ascii=False).encode('utf-8')
headers = {'Content-Type': 'application/json', 'Accept': 'text/event-stream',
           'Authorization': 'Bearer ' + t['api_key']}
res = transport.http_request(url, method='POST', headers=headers, body=raw,
                             connect_timeout=15, idle_timeout=60, total_timeout=180, stream=True)
ns = protocol.normalize_responses(res)
print('url', url)
print('status', res.http_status, 'error_kind', res.error_kind, 'error', res.error)
print('terminal', ns.terminal, 'terminal_reason', ns.terminal_reason)
print('text', repr(ns.text), 'final_text', repr(ns.final_text))
print('reasoning_len', len(ns.reasoning), 't_first_text', res.rel(ns.t_first_text) if ns.t_first_text else None)
print('usage', ns.usage, 'frames', len(res.frames), 'is_event_stream', res.is_event_stream)
print('unknown_events', ns.unknown_events[:3], 'json_errors', ns.json_errors[:3])
if res.http_status != 200 or not res.is_event_stream:
    print('body_text', res.body_text[:800])
