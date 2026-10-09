"""Probe for any server-side metrics/admin channel. Read-only GETs."""
import json, urllib.request
from datetime import datetime, timezone
from pathlib import Path

TASK = Path(__file__).resolve().parents[1]
CFG = json.loads((TASK.parents[1] / '04-测试项/saas-llm-test/archive/v1/llm-bench-kit/config.json').read_text(encoding='utf-8'))
TARGET = next(t for t in CFG['targets'] if t['name'] == 'flash-public-low')
KEY = TARGET['api_key']
BASES = ['https://tpt.supcon.com', TARGET['base_url'].rstrip('/')]
PATHS = ['/metrics', '/status', '/health', '/api/metrics', '/nginx_status',
         '/actuator/health', '/actuator/metrics', '/actuator/prometheus']


def main():
    out = {'utc': datetime.now(timezone.utc).isoformat(timespec='milliseconds'), 'results': []}
    for base in BASES:
        for p in PATHS:
            for auth in (False, True):
                req = urllib.request.Request(base + p)
                if auth:
                    req.add_header('Authorization', 'Bearer ' + KEY)
                rec = {'url': base + p, 'auth': auth}
                try:
                    r = urllib.request.urlopen(req, timeout=15)
                    body = r.read(200)
                    rec.update(status=r.status, content_type=r.headers.get('Content-Type'),
                               body_head=body[:160].decode('utf-8', 'replace'))
                except Exception as e:
                    rec.update(status=getattr(e, 'code', None), error=type(e).__name__)
                out['results'].append(rec)
    (TASK / '证据').mkdir(exist_ok=True)
    (TASK / '证据' / '服务端通道探测.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    for r in out['results']:
        print(r['status'], r['url'], 'auth' if r['auth'] else 'noauth', r.get('content_type', r.get('error', '')))


if __name__ == '__main__':
    main()
