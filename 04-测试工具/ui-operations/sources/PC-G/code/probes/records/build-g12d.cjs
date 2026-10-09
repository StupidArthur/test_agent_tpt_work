// 生成 G12-12/13/16 结果。
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../..');
const ev = fs.readFileSync(path.join(root, '运行日志/business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const g = (id) => { const e = ev.find((x) => x.event_id === id); return e ? e.value : null; };
const R = (id) => 'business-' + id;
const mk = (o) => fs.writeFileSync(path.join(root, '结果', o.case_id + '.json'), JSON.stringify(o, null, 2) + '\n');
function base(caseId, obj, inputs, actions, status, steps, assertions, notes, cleanup) {
  return { case_id: caseId, contract_version: '2.0', attempt_id: `fn-20261006-agent2-${caseId}-A1`, environment_id: 'env-fn-20261006-agent2', object_identity: obj, inputs, action_refs: actions, status, started_at: '2026-10-06T11:10:00.000Z', ended_at: '2026-10-06T11:15:00.000Z', actual_steps: steps, assertions, evidence: [{ path: '运行日志/business.jsonl', sha256: 'PLACEHOLDER' }, { path: '运行日志/业务调用.jsonl', sha256: 'PLACEHOLDER' }], cleanup: cleanup || { status: 'retained', description: '样本保留待审', read_refs: [] }, business_call_refs: [], notes };
}

mk(base('G12-12', { setting: '网页链接默认打开方式=应用内侧边栏', url: 'http://127.0.0.1:64900/fast-assert-fn-20261006-agent2/sidebar' }, ['启动 link_fixture；新任务生成 Markdown 链接并点击真实锚点'], [R('31078963-aed7-421b-9b2c-473fd8d677cb-1'), R('9bec0115-898a-4d73-991c-b2132e60bd21-1'), R('6d6404b8-a725-4954-9f18-e0565a8050c0-1')], '通过', ['读取链接打开方式初值（应用内侧边栏）', '新任务输出指向夹具 URL 的 Markdown 链接', '点击真实锚点', '读取应用内侧栏面板与夹具 GET 路径'], [{ id: 'G12-12-A1', actual: g(R('60c7cca6-4aaa-4d87-8c5d-8b4b4debc8f3-1')), read_refs: [R('60c7cca6-4aaa-4d87-8c5d-8b4b4debc8f3-1')] }, { id: 'G12-12-A2', actual: g(R('1f5f1c82-00c4-491a-98f5-72da9c5efea9-1')), read_refs: [R('1f5f1c82-00c4-491a-98f5-72da9c5efea9-1')] }], '应用内侧边栏打开：出现 WEBVIEW 面板；夹具记录到 GET /fast-assert-fn-20261006-agent2/sidebar'));

mk(base('G12-13', { setting: '网页链接默认打开方式=默认浏览器', url: 'http://127.0.0.1:64900/fast-assert-fn-20261006-agent2/default-browser' }, ['切默认浏览器；新任务生成另一唯一链接并点击；读夹具 UA；恢复设置'], [R('71914297-99fa-4ed0-9790-fbbb69fe9a7c-1'), R('923d0cd8-3bad-48ef-b562-da7f870cb5ca-1'), R('b276840e-f7de-4a81-9e7e-1cca930d68af-1'), R('47651e2c-5232-4a91-b0ae-543ebf7b989e-1'), R('7e7b925d-f1f2-4721-b538-cdca2c3c584f-1')], '通过', ['切换打开方式为默认浏览器', '新任务输出指向夹具 URL 的 Markdown 链接', '点击真实锚点', '读取夹具命中请求 UA', '恢复打开方式并回读'], [{ id: 'G12-13-A1', actual: g(R('cb5cb832-4ec6-4da4-828e-b438708a06ce-1')), read_refs: [R('cb5cb832-4ec6-4da4-828e-b438708a06ce-1')] }, { id: 'G12-13-A2', actual: g(R('333a52b5-06d6-4408-9ebc-1939e6ee3f83-1')), read_refs: [R('333a52b5-06d6-4408-9ebc-1939e6ee3f83-1')] }], '默认浏览器打开：夹具命中请求 UA 为 Chrome/142 且不含 Electron；打开方式已恢复为 应用内侧边栏', { status: 'restored', description: '网页链接默认打开方式已恢复 应用内侧边栏', read_refs: [R('333a52b5-06d6-4408-9ebc-1939e6ee3f83-1')] }));

mk(base('G12-16', { section: '个人主页' }, ['打开设置→个人主页，读取用户名/用户类型的可编辑状态'], [R('e52f6b27-a39e-43b9-87c1-e9395fd30bd6-2')], '通过', ['打开设置个人主页', '读取身份输入框 disabled/readonly'], [{ id: 'G12-16-A1', actual: g(R('e52f6b27-a39e-43b9-87c1-e9395fd30bd6-3')), read_refs: [R('e52f6b27-a39e-43b9-87c1-e9395fd30bd6-3')] }], '用户名称 Arthur 与用户类型 个人用户 均为 disabled+readonly'));

mk(base('G12-17', { scope: '本轮可逆设置全项' }, ['独立重开设置逐项回读：语言/默认权限/工作步骤/用量/链接/代码工具/记忆/沉淀/实验/开发者/快捷键'], [R('46a56743-2237-4f43-959d-6eabaa0abc01-2')], '不确定', ['打开设置逐项读取本轮改动过的设置字段', '规范化快照', '与运行初值比较'], [{ id: 'G12-17-A1', actual: null, read_refs: [R('46a56743-2237-4f43-959d-6eabaa0abc01-3')], reason: '主题（外观）活动态无法从设置控件读取（无 aria-pressed/active 标记），快照不完整；其余 13 项（语言/默认权限/工作步骤/用量/链接/代码工具/记忆/沉淀/实验/开发者/新会话快捷键/搜索会话快捷键/字号）均与运行初值一致', failed_dependency: '外观（主题）活动态读取' }], '按契约要求：字段无法读取时 actual=null 并指出缺项，不宣称全部恢复。已读到的字段快照见 read raw.fields'));
console.log('built G12-12/13/16/17');
