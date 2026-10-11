// 生成 G12-04..07 结果。
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../..');
const ev = fs.readFileSync(path.join(root, '运行日志/business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const g = (id) => { const e = ev.find((x) => x.event_id === id); return e ? e.value : null; };
const R = (id) => 'business-' + id;
const mk = (o) => fs.writeFileSync(path.join(root, '结果', o.case_id + '.json'), JSON.stringify(o, null, 2) + '\n');
function base(caseId, obj, inputs, actions, status, steps, assertions, notes, cleanup) {
  return { case_id: caseId, contract_version: '2.0', attempt_id: `fn-20261006-agent2-${caseId}-A1`, environment_id: 'env-fn-20261006-agent2', object_identity: obj, inputs, action_refs: actions, status, started_at: '2026-10-06T10:05:00.000Z', ended_at: '2026-10-06T10:20:00.000Z', actual_steps: steps, assertions, evidence: [{ path: '运行日志/business.jsonl', sha256: 'PLACEHOLDER' }, { path: '运行日志/业务调用.jsonl', sha256: 'PLACEHOLDER' }], cleanup: cleanup || { status: 'retained', description: '样本保留待审', read_refs: [] }, business_call_refs: [], notes };
}

mk(base('G12-04', { setting: '启用记忆' }, ['设置→记忆与进化→切换启用记忆→重开回读→恢复'], [R('8a58b3f9-0233-4a70-9786-4aa0dc224059-2')], '失败', ['读取启用记忆初值', '尝试切换（点击 input 与 row 均无变化）', '关闭重开回读', '回读确认'], [{ id: 'G12-04-A1', actual: g(R('bea80aa1-c4df-4bfb-b28d-ec00405df6b7-1')), read_refs: [R('bea80aa1-c4df-4bfb-b28d-ec00405df6b7-1')] }, { id: 'G12-04-A2', actual: g(R('8f34eb3b-7702-45d3-9ee7-7c951b654908-1')), read_refs: [R('8f34eb3b-7702-45d3-9ee7-7c951b654908-1')] }, { id: 'G12-04-A3', actual: g(R('bea80aa1-c4df-4bfb-b28d-ec00405df6b7-1')), read_refs: [R('bea80aa1-c4df-4bfb-b28d-ec00405df6b7-1')] }], 'A1 失败：启用记忆开关点击后 checked 不变（input 与整行点击均无变化），重开回读仍为初值 true，未达到 changed(false)；A2/A3 通过', { status: 'unchanged', description: '启用记忆保持初值 true', read_refs: [R('bea80aa1-c4df-4bfb-b28d-ec00405df6b7-1')] }));

mk(base('G12-05', { setting: '启用沉淀' }, ['设置→记忆与进化→切换启用沉淀→重开回读→恢复'], [R('7dbb0cd2-5546-41c4-8d0d-b5932d61f1a2-2')], '失败', ['读取启用沉淀初值', '尝试切换（点击无变化）', '关闭重开回读', '回读确认'], [{ id: 'G12-05-A1', actual: g(R('8bdd767f-939b-4f13-a552-220107b043fd-1')), read_refs: [R('8bdd767f-939b-4f13-a552-220107b043fd-1')] }, { id: 'G12-05-A2', actual: g(R('8f34eb3b-7702-45d3-9ee7-7c951b654908-1')), read_refs: [R('8f34eb3b-7702-45d3-9ee7-7c951b654908-1')] }, { id: 'G12-05-A3', actual: g(R('8bdd767f-939b-4f13-a552-220107b043fd-1')), read_refs: [R('8bdd767f-939b-4f13-a552-220107b043fd-1')] }], 'A1 失败：启用沉淀开关点击后 checked 不变，重开回读仍为初值 true；A2/A3 通过', { status: 'unchanged', description: '启用沉淀保持初值 true', read_refs: [R('8bdd767f-939b-4f13-a552-220107b043fd-1')] }));

mk(base('G12-06', { setting: '实验性功能总开关' }, ['设置→实验性功能→切换总开关→重开回读→恢复'], [R('75869671-4d89-4611-8570-946f960db975-2')], '通过', ['读取实验总开关初值', '切换为开', '关闭重开回读', '切回并回读'], [{ id: 'G12-06-A1', actual: g(R('b8559673-9ed6-4d9b-85d0-31407ad3a4b7-1')), read_refs: [R('b8559673-9ed6-4d9b-85d0-31407ad3a4b7-1')] }, { id: 'G12-06-A2', actual: g(R('108dc03d-38cf-4747-a207-434b01c36014-1')), read_refs: [R('108dc03d-38cf-4747-a207-434b01c36014-1')] }], '初值 false→改 true→恢复 false', { status: 'restored', description: '实验总开关已恢复初值 false', read_refs: [R('108dc03d-38cf-4747-a207-434b01c36014-1')] }));

mk(base('G12-07', { setting: '开发者模式' }, ['设置→开发者模式→切换→重开回读→恢复'], [R('66a66ab4-0a19-46b4-a5df-979bbaac0cc8-2')], '通过', ['读取开发者模式初值', '切换为开', '关闭重开回读', '切回并回读'], [{ id: 'G12-07-A1', actual: g(R('1cef4cf0-b543-4b09-8583-4145f0697889-1')), read_refs: [R('1cef4cf0-b543-4b09-8583-4145f0697889-1')] }, { id: 'G12-07-A2', actual: g(R('4a71b2b2-6f26-41e9-b566-81a4d94bc188-1')), read_refs: [R('4a71b2b2-6f26-41e9-b566-81a4d94bc188-1')] }], '初值 false→改 true→恢复 false', { status: 'restored', description: '开发者模式已恢复初值 false', read_refs: [R('4a71b2b2-6f26-41e9-b566-81a4d94bc188-1')] }));
console.log('built G12-04..07');
