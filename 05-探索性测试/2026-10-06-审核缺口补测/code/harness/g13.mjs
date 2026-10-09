import { saveResult, callEvents, loadCalls } from './results.mjs';

const ENV = 'env-20261006-agent2';
const menusCall = loadCalls().filter((c) => c.function_name === 'ui.menus').at(-1);
const sortCall = loadCalls().filter((c) => c.function_name === 'ui.sort').at(-1);
const em = callEvents(menusCall.call_id);
const es = callEvents(sortCall.call_id);
const R = (arr, t) => arr.filter((e) => e.target === t && e.kind === 'read');
const A = (arr, t) => arr.filter((e) => e.target === t && e.kind === 'action').map((e) => e.event_id);

saveResult('G13-01', {
  environment_id: ENV, attempt_id: 'G13-01-A02', started_at: menusCall.started_at, ended_at: menusCall.ended_at,
  object_identity: 'composer @菜单', inputs: ['@'],
  action_refs: A(em, '输入@打开菜单'),
  actual_steps: ['新建任务并选择项目', '在composer输入@', '读取composer浮层完整内容'],
  assertions: [{ id: 'G13-01-A1', actual: R(em, '@菜单本地文件入口')[0].value, read_refs: [R(em, '@菜单本地文件入口')[0].event_id] }],
  cleanup: { status: 'unchanged', description: '@菜单已关闭，草稿清空，无设置/资产变更', read_refs: [] },
  business_call_refs: [menusCall.call_id],
  notes: '原问题：实际读到标准模式菜单。本轮限定composer刚输入的@浮层读取，内容含“文件与文件夹/对话”。原文见raw。',
});

saveResult('G13-04', {
  environment_id: ENV, attempt_id: 'G13-04-A02', started_at: menusCall.started_at, ended_at: menusCall.ended_at,
  object_identity: '专家iframe创建入口与导入dialog', inputs: [],
  action_refs: [...A(em, '点击新建专家'), ...A(em, '打开专家导入dialog')],
  actual_steps: ['专家iframe点击新建专家', '读取目标会话/面板创建专家标识', '打开导入dialog独立读取目录input'],
  assertions: [
    { id: 'G13-04-A1', actual: R(em, '专家创建模式')[0].value, read_refs: [R(em, '专家创建模式')[0].event_id] },
    { id: 'G13-04-A2', actual: R(em, '专家导入目录input')[0].value, read_refs: [R(em, '专家导入目录input')[0].event_id] },
  ],
  cleanup: { status: 'unchanged', description: '退出未提交的创建/导入流程，未产生专家', read_refs: [] },
  business_call_refs: [menusCall.call_id],
  notes: '原问题：专家创建效果读顶层且iframe定位错误。本轮在专家iframe点击新建专家后读取目标页面文本(含创建专家语义)，并独立读取导入dialog的webkitdirectory input。',
});

saveResult('G13-05', {
  environment_id: ENV, attempt_id: 'G13-05-A02', started_at: menusCall.started_at, ended_at: menusCall.ended_at,
  object_identity: '自动化任务推荐案例', inputs: [],
  action_refs: A(em, '打开自动化任务'),
  actual_steps: ['点击自动化任务', '探测推荐案例卡与提示词字段'],
  assertions: [{ id: 'G13-05-A1', actual: null, read_refs: [R(em, '推荐点击后预填')[0].event_id], reason: '自动化页限定表面未发现推荐案例卡(cardCount=0)，未取得可独立绑定的点击前提示词', failed_dependency: '自动化推荐卡结构/入口' }],
  cleanup: { status: 'unchanged', description: '未点击使用，无设置/资产变更', read_refs: [] },
  business_call_refs: [menusCall.call_id],
  notes: '原问题：expected取自点击后actual且命中style。本轮先探测自动化页面；未发现推荐案例卡，无法在点击前独立读取提示词，故actual=null，不做预填结论。',
});

saveResult('G13-06', {
  environment_id: ENV, attempt_id: 'G13-06-A02', started_at: menusCall.started_at, ended_at: menusCall.ended_at,
  object_identity: '帮助与反馈入口', inputs: [],
  action_refs: A(em, '打开帮助与反馈'),
  actual_steps: ['记录基线', '点击账号菜单帮助与反馈', '读取顶层/弹窗响应'],
  assertions: [{ id: 'G13-06-A1', actual: R(em, '帮助点击有可观察响应')[0].value, read_refs: [R(em, '帮助点击有可观察响应')[0].event_id] }],
  cleanup: { status: 'unchanged', description: '关闭打开的面板，无设置/资产变更', read_refs: [] },
  business_call_refs: [menusCall.call_id],
  notes: '原问题：只比顶层URL/dialog数量且点击异常被吞。本轮确认帮助与反馈菜单点击成功，并读取到新增可见dialog作为响应。raw含url/dialogs/text。',
});

saveResult('G13-11', {
  environment_id: ENV, attempt_id: 'G13-11-A02', started_at: menusCall.started_at, ended_at: menusCall.ended_at,
  object_identity: '技能iframe新建技能入口', inputs: [],
  action_refs: A(em, '点击新建技能'),
  actual_steps: ['技能iframe点击新建技能', '读取目标页面创建模式标识', '读取左侧导航可见性'],
  assertions: [
    { id: 'G13-11-A1', actual: R(em, '技能创建模式')[0].value, read_refs: [R(em, '技能创建模式')[0].event_id] },
    { id: 'G13-11-A2', actual: R(em, '创建页左导航')[0].value, read_refs: [R(em, '创建页左导航')[0].event_id] },
  ],
  cleanup: { status: 'unchanged', description: '退出未提交的创建流程', read_refs: [] },
  business_call_refs: [menusCall.call_id],
  notes: '原问题：创建技能效果用顶层前3000字扫全页。本轮点击新建技能后读取目标页面文本，未检出“创建技能”模式标识(A1=false)，左侧导航可见(A2=true)。snippet见raw。',
});

saveResult('G13-12', {
  environment_id: ENV, attempt_id: 'G13-12-A02', started_at: menusCall.started_at, ended_at: menusCall.ended_at,
  object_identity: '设置/内置插件/插件卡', inputs: [],
  action_refs: [...A(em, '展开插件卡'), ...A(em, '恢复插件卡折叠')],
  actual_steps: ['进入设置内置插件读取初始aria-expanded', '点击插件卡并读取展开后的aria-expanded与详情', '恢复初始状态并回读'],
  assertions: [
    { id: 'G13-12-A1', actual: R(em, '插件展开详情')[0].value, read_refs: [R(em, '插件展开详情')[0].event_id] },
    { id: 'G13-12-A2', actual: { before: R(em, '本轮插件卡展开状态')[0].value, after: R(em, '本轮插件卡展开状态')[1].value }, read_refs: [R(em, '本轮插件卡展开状态')[0].event_id, R(em, '本轮插件卡展开状态')[1].value && R(em, '本轮插件卡展开状态')[1].event_id] },
  ],
  cleanup: { status: 'restored', description: '插件卡恢复初始展开状态并回读', read_refs: [R(em, '本轮插件卡展开状态')[1].event_id] },
  business_call_refs: [menusCall.call_id],
  notes: '原问题：展开控件前后均null，脚本点击无操作。本轮定位到aria-expanded节点：初始true；点击后变为false(说明该卡为折叠/切换而非展开详情)，详情内容hasContent=false，故A1=false。状态前后一致(A2通过)。',
});

saveResult('G13-14', {
  environment_id: ENV, attempt_id: 'G13-14-A02', started_at: sortCall.started_at, ended_at: sortCall.ended_at,
  object_identity: '侧栏排序菜单', inputs: ['手动排序', '恢复最近更新'],
  action_refs: [...A(es, '打开排序菜单'), ...A(es, '选择另一排序'), ...A(es, '恢复排序初值')],
  actual_steps: ['打开排序菜单读取真实选中标记(.selected)', '选择手动排序并重开回读', '恢复最初读取到的项并回读'],
  assertions: [
    { id: 'G13-14-A1', actual: R(es, '排序更改选中项')[0].value, read_refs: [R(es, '排序更改选中项')[0].event_id] },
    { id: 'G13-14-A2', actual: R(es, '排序恢复选中项')[0].value, read_refs: [R(es, '排序恢复选中项')[0].event_id] },
  ],
  cleanup: { status: 'restored', description: '排序恢复为初始最近更新', read_refs: [R(es, '排序恢复选中项')[0].event_id] },
  business_call_refs: [sortCall.call_id],
  notes: '原问题：初始和更改选中项均null转空串，恢复还写死。本轮用菜单项className含selected读取真实选中项：初始最近更新→手动排序→恢复最近更新。',
});

console.log('g13 results written');
