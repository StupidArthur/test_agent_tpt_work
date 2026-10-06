const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const dir = __dirname;
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  const row = {
    at: new Date().toISOString(), method: req.method, path: u.pathname,
    marker: u.searchParams.get('marker'), host: req.headers.host,
    ua: req.headers['user-agent'] || '', fetchMode: req.headers['sec-fetch-mode'] || '',
    fetchDest: req.headers['sec-fetch-dest'] || '', origin: req.headers.origin || '', referer: req.headers.referer || ''
  };
  fs.appendFileSync(path.join(dir, 'requests.jsonl'), JSON.stringify(row) + '\n', 'utf8');
  if (u.pathname === '/shutdown') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('stopping'); server.close(() => process.exit(0)); return;
  }
  if (u.pathname === '/page') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end('<!doctype html><meta charset="utf-8"><title>Round Link Anchors</title><main><h1>ROUND_LINK_ANCHORS_20261006</h1><p><a id="sidebar" href="/target?marker=sidebar-anchor-20261006">SIDEBAR_HTML_ANCHOR_20261006</a></p><p><a id="browser" href="/target?marker=browser-anchor-20261006">BROWSER_HTML_ANCHOR_20261006</a></p></main>');
    return;
  }
  const marker = u.searchParams.get('marker') || 'missing';
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end('<!doctype html><meta charset="utf-8"><title>Round Link Target</title><main><h1>ROUND_LINK_TARGET_20261006</h1><p>' + marker + '</p></main>');
});
server.listen(0, '127.0.0.1', () => {
  const a = server.address();
  fs.writeFileSync(path.join(dir, 'server-info.json'), JSON.stringify({ pid: process.pid, host: '127.0.0.1', port: a.port, started_at: new Date().toISOString() }, null, 2) + '\n', 'utf8');
});
