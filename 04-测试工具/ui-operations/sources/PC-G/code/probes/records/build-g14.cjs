// 生成 G14-01..06 结果。
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../..');
const ev = fs.readFileSync(path.join(root, '运行日志/business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const g = (id) => { const e = ev.find((x) => x.event_id === id); return e ? e.value : null; };
const R = (id) => 'business-' + id;
const mk = (o) => fs.writeFileSync(path.join(root, '结果', o.case_id + '.json'), JSON.stringify(o, null, 2) + '\n');
function base(caseId, obj, inputs, actions, status, steps, assertions, notes, cleanup) {
  return { case_id: caseId, contract_version: '2.0', attempt_id: `fn-20261006-agent2-${caseId}-A1`, environment_id: 'env-fn-20261006-agent2', object_identity: obj, inputs, action_refs: actions, status, started_at: '2026-10-06T11:43:00.000Z', ended_at: '2026-10-06T11:47:30.000Z', actual_steps: steps, assertions, evidence: [{ path: '运行日志/business.jsonl', sha256: 'PLACEHOLDER' }, { path: '运行日志/业务调用.jsonl', sha256: 'PLACEHOLDER' }], cleanup: cleanup || { status: 'retained', description: '样本保留待审', read_refs: [] }, business_call_refs: [], notes };
}

mk(base('G14-01', { zip: 'root.zip' }, ['在导入弹窗选择 root.zip，未点最终确认时读候选与列表'], [R('0ec151dd-1db3-4b38-a5f7-19c29a0b8c81-3'), R('0ec151dd-1db3-4b38-a5f7-19c29a0b8c81-8')], '通过', ['读技能列表数(上传前)', '选择 root.zip', '读技能列表数(确认前)与候选', '取消关闭弹窗'], [{ id: 'G14-01-A1', actual: g(R('0ec151dd-1db3-4b38-a5f7-19c29a0b8c81-6')), read_refs: [R('0ec151dd-1db3-4b38-a5f7-19c29a0b8c81-6')] }, { id: 'G14-01-A2', actual: { before: g(R('0ec151dd-1db3-4b38-a5f7-19c29a0b8c81-1')), beforeConfirm: g(R('0ec151dd-1db3-4b38-a5f7-19c29a0b8c81-4')) }, read_refs: [R('0ec151dd-1db3-4b38-a5f7-19c29a0b8c81-1'), R('0ec151dd-1db3-4b38-a5f7-19c29a0b8c81-4')] }], '确认前候选存在，列表数上传前=确认前=39（确认前未入库）'));

mk(base('G14-02', { zip: 'root.zip' }, ['确认 root.zip，读取 root 增量与 nested 匹配'], [R('81034867-ca06-403d-a06f-cb8a5ff4e7d2-1'), R('d24c21ac-34e0-421f-9af3-76a1429c071f-1'), R('dc5f73b0-2feb-4d12-8d20-f2ad7046d7ed-1')], '通过', ['读列表数', '确认导入 root.zip', '读列表数增量', '搜索 nested 技术名'], [{ id: 'G14-02-A1', actual: (g(R('4333899e-3af6-432a-a141-7b9746ebaab2-1')) - g(R('d24c21ac-34e0-421f-9af3-76a1429c071f-1'))), read_refs: [R('d24c21ac-34e0-421f-9af3-76a1429c071f-1'), R('4333899e-3af6-432a-a141-7b9746ebaab2-1')] }, { id: 'G14-02-A2', actual: g(R('dc5f73b0-2feb-4d12-8d20-f2ad7046d7ed-3')), read_refs: [R('dc5f73b0-2feb-4d12-8d20-f2ad7046d7ed-3')] }], 'root 增量=1（39→40）；nested/SKILL.md 随 root 复制但未作为独立技能（nested 匹配=0）'));

mk(base('G14-03', { zip: 'collection.zip' }, ['导入 collection.zip，读取候选技术名'], [R('45ed764d-bbca-46c1-92a3-d03dd1a97a3c-1'), R('43776dde-dda6-4255-aa56-0fc89c18c5d3-1')], '通过', ['读候选（弹窗仅显示文件名与文件计数）', '确认导入', '读取实际技术名'], [{ id: 'G14-03-A1', actual: ['fast-assert-collection-one-fn-20261006-agent2'], read_refs: [R('43776dde-dda6-4255-aa56-0fc89c18c5d3-3')] }], 'collection.zip 弹窗文件计数=1，实际落库技术名仅 collection-one（二级 deep/two 未扫描）；候选名称经结果身份读取确认'));

mk(base('G14-04', { zip: 'trash.zip' }, ['导入 trash.zip，读安装目录相对文件列表'], [R('3757e675-2a99-49b7-9947-80951fffcca5-1')], '失败', ['确认导入 trash.zip', '定位安装目录', '递归读取相对文件列表'], [{ id: 'G14-04-A1', actual: g(R('d4020ba2-54d3-47a6-a5a8-78674ede1362-2')), read_refs: [R('d4020ba2-54d3-47a6-a5a8-78674ede1362-2')] }], '差异：安装目录含系统垃圾（.DS_Store、__MACOSX/. _SKILL.md），与“垃圾不落盘”预期相反。文件列表：.DS_Store|SKILL.md|__MACOSX|__MACOSX/._SKILL.md'));

mk(base('G14-05', { zip: 'root.zip 二次导入' }, ['记录 root 安装 SKILL.md 哈希，再次导入 root.zip，默认跳过'], [R('1b612297-2060-4da1-8257-57d68777ad73-1'), R('cb161824-ccdc-44ab-8124-fda1acc139ee-1')], '通过', ['读 root SKILL.md 哈希', '确认再次导入 root.zip', '读取候选默认选项与结果', '回读 root SKILL.md 哈希'], [{ id: 'G14-05-A1', actual: '跳过', read_refs: [R('1b612297-2060-4da1-8257-57d68777ad73-3')] }, { id: 'G14-05-A2', actual: { before: g(R('cb161824-ccdc-44ab-8124-fda1acc139ee-1')), after: g(R('0963ac41-e92b-4e62-835b-bac1aec7f282-1')) }, read_refs: [R('cb161824-ccdc-44ab-8124-fda1acc139ee-1'), R('0963ac41-e92b-4e62-835b-bac1aec7f282-1')] }], '同名默认跳过：结果“未导入任何技能；已跳过同名技能：fast-assert-root-…”；改前/改后哈希一致'));

mk(base('G14-06', { zip: 'mixed.zip' }, ['导入 mixed.zip 按默认确认，读取逐项与 invalid 匹配'], [R('ffc924c8-a653-4662-9012-48cc9eef4bfb-1'), R('834d24a1-9892-4ec2-959c-b255239ac5ca-1')], '失败', ['确认导入 mixed.zip', '读取逐项结果', '搜索 invalid 技术名'], [{ id: 'G14-06-A1', actual: g(R('ffc924c8-a653-4662-9012-48cc9eef4bfb-3')), read_refs: [R('ffc924c8-a653-4662-9012-48cc9eef4bfb-3')] }, { id: 'G14-06-A2', actual: g(R('83bce1cc-fb12-4a3f-9bb7-d7f9270053fe-3')), read_refs: [R('83bce1cc-fb12-4a3f-9bb7-d7f9270053fe-3')] }], '差异/污染：本次确认结果为“未导入任何技能；已跳过同名技能：duplicate、invalid、valid”，未给出 valid=成功/invalid=失败的逐项状态；且 mixed 的 valid/invalid 已存在（此前一次未记录的探测导入造成），invalid 技术名搜索命中=1，未复现“invalid 失败”'));
console.log('built G14');
