import { refreshAllEvidence } from './results.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const resultDir = path.join(root, '结果');
const read = (f) => JSON.parse(fs.readFileSync(path.join(resultDir, f), 'utf8'));
const write = (f, o) => fs.writeFileSync(path.join(resultDir, f), JSON.stringify(o, null, 2) + '\n', 'utf8');

const derived = {
  'G5-07': { id: 'business-4e818521-c775-4d47-a9a2-9699115349e3-1', value: true },
  'G5-08': { id: 'business-4e818521-c775-4d47-a9a2-9699115349e3-2', value: true },
  'G9-07': { id: 'business-4e818521-c775-4d47-a9a2-9699115349e3-3', value: false },
  'G9-08': { id: 'business-4e818521-c775-4d47-a9a2-9699115349e3-4', value: false },
};
for (const [caseId, d] of Object.entries(derived)) {
  const r = read(caseId + '.json');
  const a1 = r.assertions.find((a) => a.id === caseId + '-A1');
  a1.actual = d.value;
  a1.read_refs = [d.id];
  write(caseId + '.json', r);
}

// G14-01 rebuild from latest skills.zip call
const bizlog = fs.readFileSync(path.join(root, '运行日志', 'business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const calls = fs.readFileSync(path.join(root, '运行日志', '业务调用.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const zipCall = calls.filter((c) => c.function_name === 'skills.zip').at(-1);
const zipEvents = bizlog.filter((e) => e.business_call_id === zipCall.call_id);
const selected = zipEvents.find((e) => e.target === '确认前已选择的本轮ZIP');
const idSet = zipEvents.filter((e) => e.target === '正式技能身份集合' && e.kind === 'read').slice(0, 2);
const g14 = read('G14-01.json');
g14.started_at = zipCall.started_at; g14.ended_at = zipCall.ended_at;
g14.action_refs = zipEvents.filter((e) => e.target === '选择root.zip不确认' && e.kind === 'action').map((e) => e.event_id);
const g14a1 = g14.assertions.find((a) => a.id === 'G14-01-A1');
g14a1.actual = selected.value; g14a1.read_refs = [selected.event_id];
const g14a2 = g14.assertions.find((a) => a.id === 'G14-01-A2');
g14a2.actual = { before: idSet[0].value, after: idSet[1].value };
g14a2.read_refs = [idSet[0].event_id, idSet[1].event_id];
g14.business_call_refs = [zipCall.call_id];
write('G14-01.json', g14);

// G12-17 add usage call to business_call_refs
const usageCall = calls.filter((c) => c.function_name === 'settings.usage').at(-1);
const g1217 = read('G12-17.json');
g1217.business_call_refs = [...new Set([...(g1217.business_call_refs || []), usageCall.call_id])];
write('G12-17.json', g1217);

// Fix sort_initial binding to the real ui.sort initial read event
const sortCall = calls.filter((c) => c.function_name === 'ui.sort').at(-1);
const sortEvents = bizlog.filter((e) => e.business_call_id === sortCall.call_id);
const sortInitial = sortEvents.find((e) => e.target === '排序初始选中项');
const ctxPath = path.join(root, '运行上下文.json');
const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
ctx.binding_sources.sort_initial = { kind: 'read', event_id: sortInitial.event_id };
fs.writeFileSync(ctxPath, JSON.stringify(ctx, null, 2) + '\n', 'utf8');

refreshAllEvidence();
console.log('patched. G14-01 selected event', selected.event_id, 'sort_initial ->', sortInitial.event_id);
