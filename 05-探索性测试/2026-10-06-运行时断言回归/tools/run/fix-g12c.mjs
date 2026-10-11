import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { root } from './lib.mjs';

const group = 'G12c';
const logPath = path.join(root, '运行日志', group + '.jsonl');
const linkPath = path.join(root, '运行日志', 'link-requests.jsonl');
const envId = 'env-20261006-oc1';
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

// recompute external UA read from fixture log
const lines = fs.existsSync(linkPath) ? fs.readFileSync(linkPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
const ext = lines.filter(l => /external/.test(l.path || l.url || ''));
const ua = ext.length ? (ext[ext.length - 1].user_agent || ext[ext.length - 1].userAgent || '') : '';
const value = /Chrome/i.test(ua) && !/Electron/i.test(ua);
const event = { event_id: group + '-fix-' + Date.now(), captured_at: new Date().toISOString(), environment_id: envId, kind: 'read', target: '默认浏览器User-Agent', object_id: 'link.fixture.ua.external', source: { channel: 'file', scope: 'link夹具请求日志', locator: linkPath }, value, raw: { ua, count: ext.length }, derivation: 'UA matches Chrome and not Electron' };
fs.appendFileSync(logPath, JSON.stringify(event) + '\n', 'utf8');

const ev = [{ path: '运行日志/' + group + '.jsonl', sha256: sha(logPath) }, { path: '运行日志/link-requests.jsonl', sha256: sha(linkPath) }];
for (const id of ['G12-08', 'G12-09', 'G12-12', 'G12-13']) {
  const p = path.join(root, '结果', id + '.json');
  if (!fs.existsSync(p)) continue;
  const r = JSON.parse(fs.readFileSync(p, 'utf8'));
  r.evidence = ev;
  if (id === 'G12-13') { const a = r.assertions.find(x => x.id === 'G12-13-A1'); a.actual = value; a.read_refs = [event.event_id]; }
  fs.writeFileSync(p, JSON.stringify(r, null, 2) + '\n', 'utf8');
}
console.log('fixed', value, ua.slice(0, 40));
