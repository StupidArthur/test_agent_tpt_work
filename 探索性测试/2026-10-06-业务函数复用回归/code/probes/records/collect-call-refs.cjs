// 记录维护脚本：将每条结果引用的所有事件对应 business_call_id 汇总进 business_call_refs。
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../..');
const ev = fs.readFileSync(path.join(root, '运行日志/business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const byId = new Map(ev.map((e) => [e.event_id, e]));
const dir = path.join(root, '结果');
let n = 0;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.json')) continue;
  const p = path.join(dir, f);
  const r = JSON.parse(fs.readFileSync(p, 'utf8'));
  const refs = new Set(r.business_call_refs || []);
  const ids = [...(r.action_refs || []), ...(r.assertions || []).flatMap((a) => a.read_refs || []), ...((r.cleanup && r.cleanup.read_refs) || [])];
  for (const id of ids) { const e = byId.get(id); if (e && e.business_call_id) refs.add(e.business_call_id); }
  r.business_call_refs = [...refs];
  fs.writeFileSync(p, JSON.stringify(r, null, 2) + '\n', 'utf8');
  n += 1;
}
console.log(JSON.stringify({ results: n }));
