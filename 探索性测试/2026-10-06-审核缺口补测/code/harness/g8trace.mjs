import { saveResult, callEvents, lastCall } from './results.mjs';

const call = lastCall('trace.run');
const ev = callEvents(call.call_id);
const R = (t) => ev.filter((e) => e.target === t && e.kind === 'read')[0];
const A = (t) => ev.filter((e) => e.target === t && e.kind === 'action').map((e) => e.event_id);
const ENV = 'env-20261006-agent2';
const collapsed = R('完成工作步骤默认折叠');
const expanded = R('展开后执行记录可读');
const params = R('成功读取工具的路径列表');
const output = R('成功read输出');

saveResult('G8-06', {
  environment_id: ENV, attempt_id: 'G8-06-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: '本轮会话成功read工具步骤',
  inputs: ['请在目录 .fast-assert-20261006-agent2 中读取 flow.txt'],
  action_refs: A('发起文件读取请求'),
  actual_steps: ['发起本轮文件读取并等待终态', '定位工具调用步骤节点', '尝试读取该步骤参数与输出'],
  assertions: [
    { id: 'G8-06-A1', actual: null, read_refs: [params.event_id], reason: '展开后工具步骤节点文本为空，未定位到实际参数路径', failed_dependency: '工具步骤详情渲染/定位' },
    { id: 'G8-06-A2', actual: null, read_refs: [output.event_id], reason: '展开后工具步骤节点文本为空，未定位到实际输出', failed_dependency: '工具步骤详情渲染/定位' },
  ],
  cleanup: { status: 'retained', description: '本轮会话保留待审；无设置/资产变更', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：整页包含工具路径与用户请求，不证明参数输出已显示。本轮定位到 [data-slot="tool.call.toolview"] 步骤节点，但其 innerText 为空，未取到参数/输出，故两项记未观测。',
});

saveResult('G8-09', {
  environment_id: ENV, attempt_id: 'G8-09-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: '本轮会话工具调用组合步骤',
  inputs: ['请在目录 .fast-assert-20261006-agent2 中读取 flow.txt'],
  action_refs: [...A('发起文件读取请求'), ...A('展开工具步骤')],
  actual_steps: ['发起本轮文件读取并等待终态', '读取工具步骤面板aria-expanded', '实际展开并读取子步骤记录'],
  assertions: [
    { id: 'G8-09-A1', actual: collapsed.value, read_refs: [collapsed.event_id] },
    { id: 'G8-09-A2', actual: null, read_refs: [expanded.event_id], reason: '展开后工具步骤节点文本为空，未读到实际执行记录', failed_dependency: '工具步骤详情渲染/定位' },
  ],
  cleanup: { status: 'retained', description: '本轮会话保留待审；无设置/资产变更', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：泛化aria-expanded与整页文字没有绑定目标组合工具组。本轮定位到 tool.call.toolview 步骤的 [aria-expanded]：默认 false(A1=true)；点击展开后节点文本仍为空，A2未观测。',
});

console.log('g8 trace results written');
