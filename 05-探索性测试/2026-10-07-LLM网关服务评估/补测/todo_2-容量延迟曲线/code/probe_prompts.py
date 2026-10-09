"""Compare echo-instruction variants for marker compliance (sequential, low volume)."""
import json, sys, time, uuid
from pathlib import Path

TASK = Path(__file__).resolve().parents[1]
ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT / '04-测试项/saas-llm-test/code'))
from llm_probe import protocol as P, transport as T  # noqa: E402

CFG = json.loads((ROOT / '04-测试项/saas-llm-test/archive/v1/llm-bench-kit/config.json').read_text(encoding='utf-8'))
TGT = next(t for t in CFG['targets'] if t['name'] == 'flash-public-low')
URL = TGT['base_url'].rstrip('/') + '/responses'
H = {'Content-Type': 'application/json', 'Accept': 'text/event-stream', 'Authorization': 'Bearer ' + TGT['api_key']}

VARIANTS = {
    'v1_zh_only': '只输出 {m}',
    'v2_zh_copy': '请原样复制下面的字符串，只输出它，不要添加任何解释、前后缀或标点：{m}',
    'v3_en_exact': 'Reply with exactly this token and nothing else: {m}',
    'v4_zh_marker': '这是回显测试。请只输出标记本身：{m}',
}


def run(prompt_tmpl, n=15):
    ok = 0
    texts = []
    for _ in range(n):
        m = 'CAP_' + uuid.uuid4().hex[:12]
        body = P.responses_body('flash', text=prompt_tmpl.format(m=m), stream=True,
                                max_output_tokens=256, reasoning_effort='low')
        res = T.http_request(URL, method='POST', headers=H, body=json.dumps(body, ensure_ascii=False).encode(),
                             stream=True, connect_timeout=15, idle_timeout=30, total_timeout=60)
        ns = P.normalize(res, 'responses')
        good = res.http_status == 200 and ns.terminal == 'completed' and not ns.json_errors and (ns.text or '').strip() == m
        print(f'  {name} {"OK" if good else "BAD"} status={res.http_status} term={ns.terminal} err={res.error_kind} t={res.rel(res.t_end)}', flush=True)
        ok += int(good)
        if not good:
            texts.append((ns.terminal, (ns.text or '')[:40]))
    return ok, n, texts


if __name__ == '__main__':
    for name, tmpl in VARIANTS.items():
        ok, n, bad = run(tmpl)
        print(f'{name}: {ok}/{n}', 'bad=', bad[:2])
