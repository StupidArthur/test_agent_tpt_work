// 生成 G13-01..14 结果。
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../..');
const ev = fs.readFileSync(path.join(root, '运行日志/business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const g = (id) => { const e = ev.find((x) => x.event_id === id); return e ? e.value : null; };
const R = (id) => 'business-' + id;
const mk = (o) => fs.writeFileSync(path.join(root, '结果', o.case_id + '.json'), JSON.stringify(o, null, 2) + '\n');
function base(caseId, obj, inputs, actions, status, steps, assertions, notes, cleanup) {
  return { case_id: caseId, contract_version: '2.0', attempt_id: `fn-20261006-agent2-${caseId}-A1`, environment_id: 'env-fn-20261006-agent2', object_identity: obj, inputs, action_refs: actions, status, started_at: '2026-10-06T11:20:00.000Z', ended_at: '2026-10-06T11:38:00.000Z', actual_steps: steps, assertions, evidence: [{ path: '运行日志/business.jsonl', sha256: 'PLACEHOLDER' }, { path: '运行日志/业务调用.jsonl', sha256: 'PLACEHOLDER' }], cleanup: cleanup || { status: 'retained', description: '样本保留待审', read_refs: [] }, business_call_refs: [], notes };
}

mk(base('G13-01', { entry: '@ 入口', menu: 'composer @ 菜单' }, ['在空白任务 composer 输入 @ 读取限定菜单'], [R('357e2349-d29b-47b6-91d0-74dbf8aeab59-1')], '失败', ['新建空白任务', 'composer 输入 @', '读取弹出菜单标签'], [{ id: 'G13-01-A1', actual: g(R('357e2349-d29b-47b6-91d0-74dbf8aeab59-3')), read_refs: [R('357e2349-d29b-47b6-91d0-74dbf8aeab59-3')] }], '@ 菜单仅含“对话”标题与对话列表，未出现文件/本地资料入口（标签集合=["对话"]）'));

mk(base('G13-02', { entry: '+ 入口', menu: '添加文件或调用指令菜单' }, ['点击 composer 的“添加文件或调用指令”读取菜单'], [R('9bc9a295-206c-4ca6-923c-779c50da39cb-1')], '通过', ['新建空白任务', '点击添加文件或调用指令', '读取菜单标签'], [{ id: 'G13-02-A1', actual: g(R('9bc9a295-206c-4ca6-923c-779c50da39cb-3')), read_refs: [R('9bc9a295-206c-4ca6-923c-779c50da39cb-3')] }], '菜单标签含 专家（["添加本地文件","从我的资料库添加","连接器","技能","专家","模式"]）'));

mk(base('G13-03', { page: '技能页' }, ['打开技能页读取顶部双页签'], [R('a5403b6a-44b2-4a93-8611-8ecca22c6773-2')], '通过', ['打开技能页', '读取我的技能/技能市场页签可见可点击'], [{ id: 'G13-03-A1', actual: g(R('a5403b6a-44b2-4a93-8611-8ecca22c6773-3')), read_refs: [R('a5403b6a-44b2-4a93-8611-8ecca22c6773-3')] }], '我的技能(36) 与 技能市场(1) 双页签均可见可点击'));

mk(base('G13-04', { page: '专家页', entry: '新建专家/导入专家' }, ['点击新建专家读取创建模式；打开导入专家读 webkitdirectory 输入'], [R('fa168838-723e-4bb5-86cd-f05bb02d08d7-1'), R('b65318fa-0767-40cc-9957-380786931dde-1')], '失败', ['点击新建专家', '读取 composer 预置创建专家指令', '打开导入专家 dialog 读取目录选择输入'], [{ id: 'G13-04-A1', actual: g(R('fa168838-723e-4bb5-86cd-f05bb02d08d7-3')), read_refs: [R('fa168838-723e-4bb5-86cd-f05bb02d08d7-3')] }, { id: 'G13-04-A2', actual: g(R('b65318fa-0767-40cc-9957-380786931dde-3')), read_refs: [R('b65318fa-0767-40cc-9957-380786931dde-3')] }], 'A1 通过：composer 预置“/expert-manager 帮我创建一个 XXX 专家…”。A2 失败：导入 dialog 内无 webkitdirectory/文件输入（DOM 中无 input[webkitdirectory]/input[type=file]）', { status: 'retained', description: '导入 dialog 保留观察，已 Escape 关闭', read_refs: [] }));

mk(base('G13-05', { page: '自动化任务', case: '工业 AI 每日简报' }, ['读取案例提示词，点击案例后读取 composer 预填'], [R('c4978834-27b2-4ecc-9804-f15c0d0596f0-1')], '通过', ['打开自动化任务页', '读取案例卡提示词字段', '点击案例', '读取 composer 纯文本 trim'], [{ id: 'G13-05-A1', actual: g(R('c4978834-27b2-4ecc-9804-f15c0d0596f0-6')), read_refs: [R('c4978834-27b2-4ecc-9804-f15c0d0596f0-6')] }], '点击前案例提示词（c4978834-3）与点击后 composer 精确一致：每天生成工业 AI、流程工业、Agent、Skill 和 MCP 最新动态。'));

mk(base('G13-06', { entry: '更多→帮助/反馈' }, ['点击更多后尝试打开帮助/反馈，读取新页面/dialog'], [R('8f2c60be-9253-4946-a3f8-18dc439d4fff-1')], '不确定', ['点击更多', '尝试点击帮助', '读取新页面/dialog'], [{ id: 'G13-06-A1', actual: null, read_refs: [R('8f2c60be-9253-4946-a3f8-18dc439d4fff-3')], reason: '点击“更多”未展开含“帮助/反馈”的菜单（仅出现“标准模式”浮层），未定位到帮助入口，无法观察帮助目标是否打开', failed_dependency: '帮助/反馈入口定位' }], '未观测：更多菜单未展开帮助项'));

mk(base('G13-07', { page: '技能页', query: '本轮中文优先' }, ['技能页搜索中文名并读取命中'], [R('3f27b91a-97bc-495f-9f1d-e8316fe5d64a-1')], '通过', ['技能页搜索“本轮中文优先”', '按本轮身份计数'], [{ id: 'G13-07-A1', actual: g(R('3f27b91a-97bc-495f-9f1d-e8316fe5d64a-3')), read_refs: [R('3f27b91a-97bc-495f-9f1d-e8316fe5d64a-3')] }], '中文名搜索结果中本轮技能身份计数=1'));

mk(base('G13-08', { page: '技能页', query: 'FAST_SEARCH_TAG' }, ['技能页按标签搜索并读取命中'], [R('bffd2470-e469-43e6-b5b8-c770a9347fbe-1')], '通过', ['技能页搜索“FAST_SEARCH_TAG”', '按本轮技能身份计数'], [{ id: 'G13-08-A1', actual: g(R('bffd2470-e469-43e6-b5b8-c770a9347fbe-3')), read_refs: [R('bffd2470-e469-43e6-b5b8-c770a9347fbe-3')] }], '标签搜索结果中本轮技能身份计数=1'));

mk(base('G13-09', { page: '技能页', card: '本轮中文优先' }, ['列表切换开关不进入详情，回读改前/改后/恢复'], [R('e864dd1c-5575-49b5-b86f-bfd387e6217e-2'), R('e864dd1c-5575-49b5-b86f-bfd387e6217e-6')], '通过', ['搜索定位本轮卡片', '读开关改前', '切换开关', '读列表可见且详情未打开', '恢复开关并回读'], [{ id: 'G13-09-A1', actual: g(R('e864dd1c-5575-49b5-b86f-bfd387e6217e-5')), read_refs: [R('e864dd1c-5575-49b5-b86f-bfd387e6217e-5')] }, { id: 'G13-09-A2', actual: { before: g(R('e864dd1c-5575-49b5-b86f-bfd387e6217e-1')), after: g(R('e864dd1c-5575-49b5-b86f-bfd387e6217e-8')) }, read_refs: [R('e864dd1c-5575-49b5-b86f-bfd387e6217e-1'), R('e864dd1c-5575-49b5-b86f-bfd387e6217e-8')] }], '开关切换不打开详情；改前/恢复后均为 true', { status: 'restored', description: '技能开关已恢复初值 true', read_refs: [R('e864dd1c-5575-49b5-b86f-bfd387e6217e-8')] }));

mk(base('G13-10', { page: '技能页', card: '本轮中文优先' }, ['点击卡片主体打开详情读取身份'], [R('f86deb00-3d32-425a-a535-01237da10108-1')], '通过', ['搜索定位本轮卡片', '点击卡片主体', '读取详情文本身份'], [{ id: 'G13-10-A1', actual: g(R('f86deb00-3d32-425a-a535-01237da10108-3')), read_refs: [R('f86deb00-3d32-425a-a535-01237da10108-3')] }], '详情为本轮 cn-all（详情文本含 fast-assert-cn-all-fn-20261006-agent2 与 本轮中文优先）'));

mk(base('G13-11', { page: '技能页', entry: '新建技能' }, ['点击新建技能读取创建模式与面板可见'], [R('d7ebfa6b-1cfc-476e-bdae-aca8d9623540-1')], '通过', ['点击新建技能', '读取 composer 预置指令', '读取面板可见'], [{ id: 'G13-11-A1', actual: g(R('d7ebfa6b-1cfc-476e-bdae-aca8d9623540-3')), read_refs: [R('d7ebfa6b-1cfc-476e-bdae-aca8d9623540-3')] }, { id: 'G13-11-A2', actual: g(R('d7ebfa6b-1cfc-476e-bdae-aca8d9623540-4')), read_refs: [R('d7ebfa6b-1cfc-476e-bdae-aca8d9623540-4')] }], '新会话 composer 预置 /create-skill'));

mk(base('G13-12', { page: '插件页' }, ['打开插件页点击卡片读取 aria-expanded 与详情'], [], '不确定', ['尝试打开插件页与卡片'], [{ id: 'G13-12-A1', actual: null, reason: '无法定位插件页卡片详情展开控件（插件页未渲染含 aria-expanded 的详情卡，主表面无可见插件卡片）', failed_dependency: '插件页卡片/详情控件定位' }, { id: 'G13-12-A2', actual: null, reason: '同上，未取到 aria-expanded 改前/恢复值', failed_dependency: '插件页卡片/详情控件定位' }], '未观测：插件页卡片未定位'));

mk(base('G13-13', { page: '侧栏搜索', query: 'session-ad2534f2-7385-4c78-92d5-bd70bcfad671' }, ['侧栏搜索会话 id 读取匹配数'], [R('edd422e9-b095-459c-aa5f-49094d24fedb-1')], '不确定', ['打开侧栏搜索', '输入会话 id', '读取结果行匹配数'], [{ id: 'G13-13-A1', actual: null, read_refs: [R('edd422e9-b095-459c-aa5f-49094d24fedb-3')], reason: '搜索结果行为 5 行且文本/属性均不含会话 id（total=5, matched=0），无法按 session id 判定命中数', failed_dependency: '结果行 session id 载体' }], '未观测：结果行不含 session id'));

mk(base('G13-14', { side: '侧栏排序' }, ['读取排序改后与恢复后选中值'], [R('39257a3d-f6db-4065-ae6c-8d7bf057ac8d-2'), R('8c0edf6f-6f6d-4ef3-855f-53e9159bd6a1-2')], '通过', ['读取排序初值', '切换为最近更新并回读', '恢复手动排序并回读'], [{ id: 'G13-14-A1', actual: g(R('5ba7e5bc-29bd-46d7-b84a-5a4e44588bcf-3')), read_refs: [R('5ba7e5bc-29bd-46d7-b84a-5a4e44588bcf-3')] }, { id: 'G13-14-A2', actual: g(R('f1a0c94f-4708-480f-89f1-c482e5b1f4a3-3')), read_refs: [R('f1a0c94f-4708-480f-89f1-c482e5b1f4a3-3')] }], 'sort_initial=手动排序，changed=最近更新；恢复后回读 手动排序', { status: 'restored', description: '排序已恢复初值 手动排序', read_refs: [R('f1a0c94f-4708-480f-89f1-c482e5b1f4a3-3')] }));
console.log('built G13');
