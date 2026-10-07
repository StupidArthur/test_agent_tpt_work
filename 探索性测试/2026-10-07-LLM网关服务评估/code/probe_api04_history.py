"""API-04 补测：找出网关接受的 Responses 历史形态（有限修正，保留原 attempt）。"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from llm_probe.evidence import EvidenceStore  # noqa: E402
from llm_probe.protocol import responses_body  # noqa: E402
from llm_probe.transport import http_request  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://tpt.supcon.com/tpt-work-router/v1"
KEY = os.environ.get("TPT_API_KEY")
MARK = "CTX_probe01"
H = {"Content-Type": "application/json", "Authorization": f"Bearer {KEY}"} if KEY else {"Content-Type": "application/json"}

variants = {
    "A_str_all": [
        {"role": "user", "content": f"记住标记 {MARK}，回答 OK"},
        {"role": "assistant", "content": "OK"},
        {"role": "user", "content": "刚才的标记是什么？只输出标记本身。"},
    ],
    "B_user_arr_assist_str": [
        {"role": "user", "content": [{"type": "input_text", "text": f"记住标记 {MARK}，回答 OK"}]},
        {"role": "assistant", "content": "OK"},
        {"role": "user", "content": [{"type": "input_text", "text": "刚才的标记是什么？只输出标记本身。"}]},
    ],
    "C_message_type": [
        {"type": "message", "role": "user", "content": [{"type": "input_text", "text": f"记住标记 {MARK}，回答 OK"}]},
        {"type": "message", "role": "assistant", "content": [{"type": "output_text", "text": "OK"}]},
        {"type": "message", "role": "user", "content": [{"type": "input_text", "text": "刚才的标记是什么？只输出标记本身。"}]},
    ],
}

store = EvidenceStore(os.path.join(ROOT, "证据"), index_path=os.path.join(ROOT, "证据索引.jsonl"))
out = {}
for name, items in variants.items():
    body = responses_body("flash", input_items=items, stream=False, max_output_tokens=16)
    r = http_request(BASE + "/responses", method="POST", headers=H,
                     body=json.dumps(body).encode(), connect_timeout=10, idle_timeout=30, total_timeout=60,
                     stream=False)
    try:
        obj = json.loads(r.body_text)
    except Exception:
        obj = None
    txt = ""
    if obj:
        for it in obj.get("output") or []:
            if it.get("type") == "message":
                txt = "".join(c.get("text", "") for c in it.get("content") or [])
    out[name] = {"http_status": r.http_status, "text": txt,
                 "error": (obj or {}).get("error", {}).get("message", "")[:200] if obj else r.body_text[:200]}
    store.write_json(f"api/API-04_probe_{name}.json",
                     {"http_status": r.http_status, "body_text": r.body_text[:3000], "text": txt},
                     instances=["API-04/tpt-gateway-public/context"], kind="probe")
    print(name, "->", out[name]["http_status"], repr(txt), out[name]["error"])

store.write_json("api/API-04_probe_summary.json", out,
                 instances=["API-04/tpt-gateway-public/context"], kind="probe_summary")
print(json.dumps(out, ensure_ascii=False))
