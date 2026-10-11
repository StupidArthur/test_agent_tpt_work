import { refreshAllEvidence } from './results.mjs';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..', '..');
const dir = path.join(root, '结果');
const all = fs.readFileSync(path.join(root, '运行日志', 'business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const cleanupEvents = {};
for (const e of all) {
  if (e.target === '技能停用回读' && e.kind === 'read') cleanupEvents[e.object_id] = e.event_id;
}
const addCleanup = (caseId, objectId) => {
  const p = path.join(dir, caseId + '.json');
  const r = JSON.parse(fs.readFileSync(p, 'utf8'));
  r.cleanup = r.cleanup || { status: 'retained', description: '' };
  r.cleanup.read_refs = [...new Set([...(r.cleanup.read_refs || []), cleanupEvents[objectId]].filter(Boolean))];
  fs.writeFileSync(p, JSON.stringify(r, null, 2) + '\n', 'utf8');
};
addCleanup('G3-03', 'cleanup.fast-assert-skillc-20261006-agent2');
addCleanup('G3-04', 'cleanup.fast-assert-skillc-20261006-agent2');
addCleanup('G10-07', 'cleanup.fast-assert-rich-20261006-agent2');
addCleanup('G10-09', 'cleanup.fast-assert-rich-20261006-agent2');
addCleanup('G13-10', 'cleanup.fast-assert-cn-all-20261006-agent2');
refreshAllEvidence();
console.log('cleanup refs added; evidence refreshed');
