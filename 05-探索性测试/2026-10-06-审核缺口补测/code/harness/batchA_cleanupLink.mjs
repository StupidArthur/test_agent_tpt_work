import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..', '..');
const calls = fs.readFileSync(path.join(root, '运行日志', '业务调用.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const cleanupCall = calls.filter((c) => c.function_name === 'batchA.cleanup').at(-1);
for (const id of ['G3-03', 'G3-04', 'G10-07', 'G10-09', 'G13-10']) {
  const p = path.join(root, '结果', id + '.json');
  const r = JSON.parse(fs.readFileSync(p, 'utf8'));
  r.business_call_refs = [...new Set([...(r.business_call_refs || []), cleanupCall.call_id])];
  fs.writeFileSync(p, JSON.stringify(r, null, 2) + '\n', 'utf8');
}
console.log('cleanup call linked to results:', cleanupCall.call_id);
