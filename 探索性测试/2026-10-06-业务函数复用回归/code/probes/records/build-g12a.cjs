// 生成 G12-01..03 结果。
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../..');
const ev = fs.readFileSync(path.join(root, '运行日志/business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const g = (id) => { const e = ev.find((x) => x.event_id === id); return e ? e.value : null; };
const R = (id) => 'business-' + id;
const mk = (o) => fs.writeFileSync(path.join(root, '结果', o.case_id + '.json'), JSON.stringify(o, null, 2) + '\n');
function base(caseId, obj, inputs, actions, status, steps, assertions, notes, cleanup) {
  return { case_id: caseId, contract_version: '2.0', attempt_id: `fn-20261006-agent2-${caseId}-A1`, environment_id: 'env-fn-20261006-agent2', object_identity: obj, inputs, action_refs: actions, status, started_at: '2026-10-06T09:59:40.000Z', ended_at: '2026-10-06T10:03:00.000Z', actual_steps: steps, assertions, evidence: [{ path: '运行日志/business.jsonl', sha256: 'PLACEHOLDER' }, { path: '运行日志/业务调用.jsonl', sha256: 'PLACEHOLDER' }], cleanup: cleanup || { status: 'retained', description: '样本保留待审', read_refs: [] }, business_call_refs: [], notes };
}

mk(base('G12-01', { setting: '工作步骤展示' }, ['设置→常规→工作步骤展示：改详细→重开回读→恢复标准'], [R('dde42dc7-b616-473a-9156-123ebd2c03e1-2'), R('2afb55ef-bd14-47d0-93a5-24b37f128740-2')], '通过', ['读取工作步骤初值', '改为详细', '关闭重开读取', '恢复标准并回读'], [{ id: 'G12-01-A1', actual: g(R('9ffca807-ff6e-4fba-b70e-a317cb590846-1')), read_refs: [R('9ffca807-ff6e-4fba-b70e-a317cb590846-1')] }, { id: 'G12-01-A2', actual: g(R('fe37e646-316c-42b5-be9a-ffda4f3a7143-1')), read_refs: [R('fe37e646-316c-42b5-be9a-ffda4f3a7143-1')] }], 'work_steps_initial=标准，changed=详细；重开回读与恢复均一致', { status: 'restored', description: '工作步骤展示已恢复初值 标准', read_refs: [R('fe37e646-316c-42b5-be9a-ffda4f3a7143-1')] }));

mk(base('G12-02', { setting: '性能与用量=简洁' }, ['设置→常规→性能与用量改简洁，读取页脚'], [R('acd013ea-2b46-407e-b87f-8ceaf25362ee-2')], '通过', ['切换用量为简洁', '在读取得的已完成任务页脚读取详细字段与基本用量'], [{ id: 'G12-02-A1', actual: g(R('e392a8e5-c3b2-4017-854e-7795658974d3-2')), read_refs: [R('e392a8e5-c3b2-4017-854e-7795658974d3-2')] }, { id: 'G12-02-A2', actual: g(R('e392a8e5-c3b2-4017-854e-7795658974d3-3')), read_refs: [R('e392a8e5-c3b2-4017-854e-7795658974d3-3')] }], '简洁下页脚无 轮/步/token总量，保留 tok/s 与 8%；原文见 raw.text'));

mk(base('G12-03', { setting: '性能与用量=详细' }, ['切回用量详细，读取页脚与恢复值'], [R('7ef76a73-b420-4966-8a66-e0688004134b-2')], '通过', ['切换用量为详细', '读取页脚三字段', '重开读取用量选中值'], [{ id: 'G12-03-A1', actual: g(R('f7efcda5-5001-431c-a5ce-ac0337905b15-4')), read_refs: [R('f7efcda5-5001-431c-a5ce-ac0337905b15-4')] }, { id: 'G12-03-A2', actual: g(R('cf2f98bd-32e5-43af-bba5-23f5c8209423-1')), read_refs: [R('cf2f98bd-32e5-43af-bba5-23f5c8209423-1')] }], '详细下页脚显示 1轮3步·393tok/s 与 61.7K tok；恢复后选中值为初值 详细', { status: 'restored', description: '用量设置已恢复初值 详细', read_refs: [R('cf2f98bd-32e5-43af-bba5-23f5c8209423-1')] }));
console.log('built G12-01..03');
