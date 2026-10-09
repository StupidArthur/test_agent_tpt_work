"""Loopback-only HTTP target; append real browser requests to a JSONL log."""
import argparse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import threading

parser = argparse.ArgumentParser()
parser.add_argument('--run', required=True)
parser.add_argument('--log', required=True)
args = parser.parse_args()
if not re.fullmatch(r'[A-Za-z0-9_-]{1,64}', args.run):
    parser.error('invalid run suffix')
log = Path(args.log).resolve()
root = Path(__file__).resolve().parent.parent
if root not in log.parents:
    parser.error('log must be inside this task directory')
log.parent.mkdir(parents=True, exist_ok=True)
lock = threading.Lock()

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        with lock, log.open('a', encoding='utf-8') as output:
            output.write(json.dumps({'captured_at': datetime.now(timezone.utc).isoformat(), 'path': self.path,
                                     'user_agent': self.headers.get('User-Agent', '')}, ensure_ascii=False) + '\n')
        body = ('<!doctype html><meta charset="utf-8"><title>Fast assertion link</title>'
                '<h1>FAST_LINK_TARGET ' + args.run + '</h1>').encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *unused):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
print(json.dumps({'base_url': f'http://127.0.0.1:{server.server_port}/fast-assert-{args.run}',
                  'log': str(log)}, ensure_ascii=False), flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
