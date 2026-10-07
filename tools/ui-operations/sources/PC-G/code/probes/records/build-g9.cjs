// 生成 G9-05..15 结果（长列表从日志取值，保证 actual 与日志一致）。
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../..');
const ev = fs.readFileSync(path.join(root, '运行日志/business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const g = (id) => { const e = ev.find((x) => x.event_id === id); return e ? e.value : null; };
const net = ev.filter((x) => x.target === '网络icon实际请求数').pop();
const R = (id) => 'business-' + id;
function base(caseId, ver, obj, inputs, actions, status, steps, assertions, notes) {
  return { case_id: caseId, contract_version: ver, attempt_id: `fn-20261006-agent2-${caseId}-A1`, environment_id: 'env-fn-20261006-agent2', object_identity: obj, inputs, action_refs: actions, status, started_at: '2026-10-06T09:04:00.000Z', ended_at: '2026-10-06T09:20:00.000Z', actual_steps: steps, assertions, evidence: [{ path: '运行日志/business.jsonl', sha256: 'PLACEHOLDER' }, { path: '运行日志/业务调用.jsonl', sha256: 'PLACEHOLDER' }], cleanup: { status: 'retained', description: '样本保留待审', read_refs: [] }, business_call_refs: [], notes };
}
const mk = (o) => fs.writeFileSync(path.join(root, '结果', o.case_id + '.json'), JSON.stringify(o, null, 2) + '\n');

mk(base('G9-05', '2.0', { skill: 'fast-assert-desc-en-fn-20261006-agent2' }, ['导入 variants/desc-en'], [R('f81eb734-17b3-4987-ab84-58b396eb12f2-4')], '通过', ['导入 desc-en', '读取卡片描述'], [{ id: 'G9-05-A1', actual: 'FAST_DESCRIPTION_EN', read_refs: [R('3231521b-5345-450b-97ee-574b288bbae4-3')] }], '缺 description_cn，回落 description_en'));

mk(base('G9-06', '2.0', { skill: 'fast-assert-desc-tech-fn-20261006-agent2' }, ['导入 variants/desc-tech'], [R('43b3aa08-22b6-40b6-b11f-e8691b2f8724-4')], '通过', ['导入 desc-tech', '读取卡片描述'], [{ id: 'G9-06-A1', actual: 'FAST_DESCRIPTION_BASE', read_refs: [R('5cbbe9ae-9f96-4470-9761-794aa668e55a-3')] }], '仅技术 description，直接展示'));

mk(base('G9-07', '2.1', { skill: '本轮缺技术名-fn-20261006-agent2' }, ['导入 variants/missing-name'], [R('a5207c9d-8293-44fc-b4dd-995af9e9939d-4')], '失败', ['记录列表身份', '导入缺技术name单文件', '读取校验反馈与列表'], [{ id: 'G9-07-A1', actual: false, read_refs: [R('a5207c9d-8293-44fc-b4dd-995af9e9939d-5')] }, { id: 'G9-07-A2', actual: { before: g(R('0b0ae3a7-c06f-49db-92c6-871037ec3609-1')), after: g(R('f3d85ca0-00c6-4a95-bd48-ca3cbdb6e928-1')) }, read_refs: [R('0b0ae3a7-c06f-49db-92c6-871037ec3609-1'), R('f3d85ca0-00c6-4a95-bd48-ca3cbdb6e928-1')] }], 'A1 失败：缺技术name样本被接受导入（无“name缺失/必填”拒绝反馈）。第2次提交因同名已存在未新增（列表29→29，故A2 same_value成立）；首次提交已新增对象（28→29），残留对象 本轮缺技术名-fn-20261006-agent2'));

mk(base('G9-08', '2.1', { skill: 'fast-assert-missing-description-fn-20261006-agent2' }, ['导入 variants/missing-description'], [R('0abece2c-3d76-42a1-a101-2841db94ca4e-4')], '失败', ['记录列表身份', '导入缺技术description单文件', '读取校验反馈与列表'], [{ id: 'G9-08-A1', actual: false, read_refs: [R('0abece2c-3d76-42a1-a101-2841db94ca4e-5')] }, { id: 'G9-08-A2', actual: { before: g(R('f3d85ca0-00c6-4a95-bd48-ca3cbdb6e928-1')), after: g(R('a52df94c-7828-4435-9058-0bfcc81f5458-1')) }, read_refs: [R('f3d85ca0-00c6-4a95-bd48-ca3cbdb6e928-1'), R('a52df94c-7828-4435-9058-0bfcc81f5458-1')] }], 'A1 失败：缺技术description样本被接受导入（无拒绝反馈）。A2 失败：列表 29→30 已变化，残留对象 fast-assert-missing-description-fn-20261006-agent2'));

mk(base('G9-09', '2.0', { skill: 'fast-assert-minimal-fn-20261006-agent2' }, ['导入 variants/minimal 并打开详情'], [R('8c297dc5-1dd8-4185-b0ff-1e071e1c8fa0-4')], '通过', ['导入 minimal', '打开详情读取元数据区'], [{ id: 'G9-09-A1', actual: false, read_refs: [R('a485a4ee-244a-497d-b233-60abed55b2d1-4')] }], '未出现空字段行（标签/版本/作者/推荐问题）'));

mk(base('G9-10', '2.0', { skill: 'fast-assert-minimal-fn-20261006-agent2' }, ['显式使用 minimal 并发送“请执行此技能固定回复规则”'], [R('49221fde-a68a-4301-852b-81c2c2db3af5-2')], '通过', ['新建任务并引入 minimal 引用', '发送固定回复规则请求', '读取助手正文与用户请求'], [{ id: 'G9-10-A1', actual: 'FAST_MINIMAL_OK', read_refs: [R('49221fde-a68a-4301-852b-81c2c2db3af5-3')] }, { id: 'G9-10-A2', actual: false, read_refs: [R('49221fde-a68a-4301-852b-81c2c2db3af5-4')] }], '复用 G9-09 已导入 minimal；用户请求不含 FAST_MINIMAL_OK'));

mk(base('G9-11', '2.0', { skill: 'fast-assert-declared-market-fn-20261006-agent2' }, ['导入 variants/declared-market 并查看来源'], [R('dc110d42-166a-45c5-ac11-4ebf4e33e255-4')], '通过', ['导入声明 type=market 的本地样本', '读取来源与市场关联'], [{ id: 'G9-11-A1', actual: '用户创建', read_refs: [R('97e29333-9066-4ed3-a5a9-176daedc30de-5')] }], 'NOTE'));
const g11 = JSON.parse(fs.readFileSync(path.join(root, '结果/G9-11.json'), 'utf8'));
g11.assertions = [{ id: 'G9-11-A1', actual: '用户创建', read_refs: [R('97e29333-9066-4ed3-a5a9-176daedc30de-4')] }, { id: 'G9-11-A2', actual: false, read_refs: [R('97e29333-9066-4ed3-a5a9-176daedc30de-5')] }];
g11.notes = '本地声明 type=market 的样本来源被规范为「用户创建」，无可信市场关联';
fs.writeFileSync(path.join(root, '结果/G9-11.json'), JSON.stringify(g11, null, 2) + '\n');

mk(base('G9-12', '2.0', { skill: 'fast-assert-rich-fn-20261006-agent2' }, ['导入 zips/rich.zip'], [R('bba94715-f41b-402e-b2ac-65478b4539b4-4')], '失败', ['导入 rich.zip', '读取卡片图标加载与资源身份'], [{ id: 'G9-12-A1', actual: true, read_refs: [R('ff457451-18de-4aab-a860-c66c99db417a-1')] }, { id: 'G9-12-A2', actual: false, read_refs: [R('ff457451-18de-4aab-a860-c66c99db417a-2')] }], 'A1 通过：卡片 img 已加载（complete, naturalWidth=48）。A2 失败：src 为 data:image/svg+xml 产品默认图标，非安装包内 icon.png'));

mk(base('G9-13', '2.0', { skill: 'fast-assert-missing-icon-fn-20261006-agent2' }, ['导入 zips/missing-icon.zip'], [R('e42e69fe-5b7c-4aa7-971d-5983f8089f22-4')], '通过', ['导入 missing-icon.zip', '读取对象存在与默认图标'], [{ id: 'G9-13-A1', actual: true, read_refs: [R('e42e69fe-5b7c-4aa7-971d-5983f8089f22-6')] }, { id: 'G9-13-A2', actual: true, read_refs: [R('193f5569-0c80-4dc2-ac6a-8458a727fb77-3')] }], '图标缺失时显示默认图标，无 broken image'));

mk(base('G9-14', '2.1', { skill: 'fast-assert-bad-png-fn-20261006-agent2' }, ['导入 zips/bad-png.zip'], [R('4de8d627-2783-4c87-8008-f94ea3bdba91-4')], '通过', ['导入 bad-png.zip', '读取该对象图标 src 与默认图标'], [{ id: 'G9-14-A1', actual: false, read_refs: [R('b6193c38-5756-46fc-ab86-845c44953fcc-2')] }, { id: 'G9-14-A2', actual: true, read_refs: [R('b6193c38-5756-46fc-ab86-845c44953fcc-3')] }], 'A1 通过：伪 PNG 未被当作有效图片（src 为默认 SVG）。A2 通过：显示默认图标'));

if (net) mk(base('G9-15', '2.0', { skill: 'fast-assert-network-icon-fn-20261006-agent2' }, ['导入前监听请求，导入 zips/network-icon.zip'], [R('97d897b3-c782-4f17-bc59-29c04e93ffb6-2')], '通过', ['监听网络请求', '导入 network-icon.zip', '读匹配请求数'], [{ id: 'G9-15-A1', actual: net.value, read_refs: [net.event_id] }], '未对本地夹具源发起请求；卡片图标仍为默认 SVG'));
console.log('built G9-05..15; net=', net ? net.event_id + ':' + net.value : null);
