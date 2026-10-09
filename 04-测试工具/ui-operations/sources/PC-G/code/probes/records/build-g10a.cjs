// 生成 G10-01..06 结果。
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../..');
const ev = fs.readFileSync(path.join(root, '运行日志/business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const g = (id) => { const e = ev.find((x) => x.event_id === id); return e ? e.value : null; };
const R = (id) => 'business-' + id;
const mk = (o) => fs.writeFileSync(path.join(root, '结果', o.case_id + '.json'), JSON.stringify(o, null, 2) + '\n');
function base(caseId, ver, obj, inputs, actions, status, steps, assertions, notes, cleanup) {
  return { case_id: caseId, contract_version: ver, attempt_id: `fn-20261006-agent2-${caseId}-A1`, environment_id: 'env-fn-20261006-agent2', object_identity: obj, inputs, action_refs: actions, status, started_at: '2026-10-06T09:17:53.744Z', ended_at: '2026-10-06T09:21:20.000Z', actual_steps: steps, assertions, evidence: [{ path: '运行日志/business.jsonl', sha256: 'PLACEHOLDER' }, { path: '运行日志/业务调用.jsonl', sha256: 'PLACEHOLDER' }], cleanup: cleanup || { status: 'retained', description: '样本保留待审', read_refs: [] }, business_call_refs: [], notes };
}

mk(base('G10-01', '2.0', { skill: 'fast-assert-rich-fn-20261006-agent2' }, ['打开 rich 技能详情'], [R('b8ef36f6-8b5a-4303-8a78-7ba2d3114d44-2')], '通过', ['打开 rich 详情', '读取选中树节点与默认预览'], [{ id: 'G10-01-A1', actual: g(R('b8ef36f6-8b5a-4303-8a78-7ba2d3114d44-3')), read_refs: [R('b8ef36f6-8b5a-4303-8a78-7ba2d3114d44-3')] }, { id: 'G10-01-A2', actual: g(R('b8ef36f6-8b5a-4303-8a78-7ba2d3114d44-4')), read_refs: [R('b8ef36f6-8b5a-4303-8a78-7ba2d3114d44-4')] }], '默认选中 SKILL.md 且预览含固定回复'));

mk(base('G10-02', '2.0', { skill: 'fast-assert-rich-fn-20261006-agent2' }, ['展开 references/handbook/advanced 并选择 checklist.md'], [R('6ef76d66-ea4b-4deb-946a-be008a1e374a-2')], '通过', ['展开深层目录并选择 checklist.md', '读取预览正文'], [{ id: 'G10-02-A1', actual: g(R('6ef76d66-ea4b-4deb-946a-be008a1e374a-3')), read_refs: [R('6ef76d66-ea4b-4deb-946a-be008a1e374a-3')] }], '深层文件可达'));

mk(base('G10-03', '2.0', { skill: 'fast-assert-rich-fn-20261006-agent2' }, ['收起 references 读取子节点可见，再展开'], [R('37881e1f-d7fb-487e-aa02-6b7b319058ba-2'), R('b06d46a0-d81f-4d0c-a404-df4f6dd17084-2')], '不确定', ['收起 references 目录', '读取 checklist.md 节点可见', '展开 references', '再次读取'], [{ id: 'G10-03-A1', actual: null, read_refs: [R('a3114c73-e70f-436a-ae99-2121b5b78110-1')], reason: "目录树节点 label 'checklist.md' 定位 count=0（选择后文本匹配不到该节点），无法判定收起后可见性", failed_dependency: '目录树节点定位' }, { id: 'G10-03-A2', actual: null, read_refs: [R('5cf66a66-d0fd-4e57-aa61-22f643151e13-1')], reason: "同 A1：节点 label 匹配 count=0，无法判定展开后可见性", failed_dependency: '目录树节点定位' }], '未观测：本读取使用按文本精确匹配目录树节点，命中 0；经由点击可打开该文件（预览正确），但可见性读取不可靠，未据此判定'));

mk(base('G10-04', '2.0', { skill: 'fast-assert-rich-fn-20261006-agent2' }, ['分别点 notes.txt 与 records.json'], [R('00f17552-257f-4151-9a82-6e8727619b8b-2'), R('da05733c-b031-4740-bef2-bdcc97a38ae3-2')], '通过', ['点 notes.txt 读正文', '点 records.json 读正文', '数预览区可编辑控件'], [{ id: 'G10-04-A1', actual: g(R('00f17552-257f-4151-9a82-6e8727619b8b-3')), read_refs: [R('00f17552-257f-4151-9a82-6e8727619b8b-3')] }, { id: 'G10-04-A2', actual: g(R('da05733c-b031-4740-bef2-bdcc97a38ae3-3')), read_refs: [R('da05733c-b031-4740-bef2-bdcc97a38ae3-3')] }, { id: 'G10-04-A3', actual: g(R('00f17552-257f-4151-9a82-6e8727619b8b-4')), read_refs: [R('00f17552-257f-4151-9a82-6e8727619b8b-4')] }], '文本/JSON 预览只读，可编辑控件=0'));

mk(base('G10-05', '2.0', { skill: 'fast-assert-rich-fn-20261006-agent2' }, ['点 assets/icon.png'], [R('a35c2273-a486-4ded-b778-afceb46ceae6-2')], '通过', ['选择 assets/icon.png', '读取预览 img 加载'], [{ id: 'G10-05-A1', actual: g(R('a35c2273-a486-4ded-b778-afceb46ceae6-5')), read_refs: [R('a35c2273-a486-4ded-b778-afceb46ceae6-5')] }], '包内图片预览加载'));

mk(base('G10-06', '2.0', { skill: 'fast-assert-rich-fn-20261006-agent2' }, ['点 data/sample.bin'], [R('b276e4cb-8f43-499b-8be0-cf17f3f59afd-2')], '通过', ['选择 data/sample.bin', '读取预览元信息与解析声称'], [{ id: 'G10-06-A1', actual: g(R('b276e4cb-8f43-499b-8be0-cf17f3f59afd-6')), read_refs: [R('b276e4cb-8f43-499b-8be0-cf17f3f59afd-6')] }, { id: 'G10-06-A2', actual: g(R('b276e4cb-8f43-499b-8be0-cf17f3f59afd-7')), read_refs: [R('b276e4cb-8f43-499b-8be0-cf17f3f59afd-7')] }], '二进制显示名称/类型/大小说明，未虚构解析'));
console.log('built G10-01..06');
