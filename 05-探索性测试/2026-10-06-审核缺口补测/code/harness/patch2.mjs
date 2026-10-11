import { refreshAllEvidence } from './results.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..', '..');
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));
const env = JSON.parse(fs.readFileSync(path.join(root, '环境记录.json'), 'utf8'));
const bizlog = fs.readFileSync(path.join(root, '运行日志', 'business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const calls = fs.readFileSync(path.join(root, '运行日志', '业务调用.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const resultDir = path.join(root, '结果');
const read = (f) => JSON.parse(fs.readFileSync(path.join(resultDir, f), 'utf8'));
const write = (f, o) => fs.writeFileSync(path.join(resultDir, f), JSON.stringify(o, null, 2) + '\n', 'utf8');

// rebuild G7-09 from latest attachments.run (has derivation on A2)
const ar = calls.filter((c) => c.function_name === 'attachments.run').at(-1);
const ev = bizlog.filter((e) => e.business_call_id === ar.call_id);
const scroll = ev.find((e) => e.target === '附件容器可滚动');
const last = ev.find((e) => e.target === '最后附件可见');
const g79 = read('G7-09.json');
g79.started_at = ar.started_at; g79.ended_at = ar.ended_at;
g79.action_refs = ev.filter((e) => e.target === '添加30份附件' && e.kind === 'action').map((e) => e.event_id);
g79.business_call_refs = [ar.call_id];
const a1 = g79.assertions.find((a) => a.id === 'G7-09-A1'); a1.actual = scroll.value; a1.read_refs = [scroll.event_id];
const a2 = g79.assertions.find((a) => a.id === 'G7-09-A2'); a2.actual = last.value; a2.read_refs = [last.event_id];
write('G7-09.json', g79);

// derived boolean read for G7-11-A1 from its original entry event
const entryEventId = read('G7-11.json').assertions.find((a) => a.id === 'G7-11-A1').read_refs[0];
const src = bizlog.find((e) => e.event_id === entryEventId);
const log = createRecorder(root, { environment_id: env.environment_id, group: 'business' });
const e = await log.read('附件清空入口(布尔派生)', 'draft.attachments.clear-entry.derived', {
  channel: 'derived', scope: src.source.scope, locator: src.source.locator, event_refs: [entryEventId],
}, async () => ({ value: !!(src.raw && src.raw.clear), raw: { source_event: entryEventId, clear: src.raw && src.raw.clear, controls: src.raw && src.raw.btns }, derivation: 'raw.clear from attachments dock control list' }));
const g711 = read('G7-11.json');
const b1 = g711.assertions.find((a) => a.id === 'G7-11-A1'); b1.actual = e.value; b1.read_refs = [e.event_id];
write('G7-11.json', g711);

refreshAllEvidence();
console.log('G7-09 rebuilt; G7-11-A1 derived ->', e.event_id);
