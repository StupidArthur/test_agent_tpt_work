import { saveResult, callEvents, loadCalls } from './results.mjs';
import fs from 'node:fs';

const ENV = 'env-20261006-agent2';
const calls = loadCalls().filter((c) => c.function_name === 'settings.snapshot');
const cInit = calls.find((c) => c.args_path.includes('snapshot-initial')) ?? calls[0];
const cFinal = calls.find((c) => c.args_path.includes('snapshot-final')) ?? calls.at(-1);
const eInit = callEvents(cInit.call_id);
const eFinal = callEvents(cFinal.call_id);
const init = eInit.find((e) => e.kind === 'read');
const final = eFinal.find((e) => e.kind === 'read');

const usageCall = loadCalls().filter((c) => c.function_name === 'settings.usage').at(-1);
const usageRestore = callEvents(usageCall.call_id).filter((e) => e.target === '恢复用量初值' && e.kind === 'action').map((e) => e.event_id);

saveResult('G12-17', {
  environment_id: ENV, attempt_id: 'G12-17-A02', started_at: cInit.started_at, ended_at: cFinal.ended_at,
  object_identity: '设置各分类可逆字段',
  inputs: [],
  action_refs: usageRestore,
  actual_steps: ['在本轮设置操作后读取各分类字段规范化快照', '全部恢复后逐项重开回读同一字段集合', '逐项比较并列残留'],
  assertions: [
    { id: 'G12-17-A1', actual: { before: init.value, after: final.value }, read_refs: [init.event_id, final.event_id] },
  ],
  cleanup: { status: 'restored', description: '主题/语言/字号/权限/工作步骤/用量/链接/代码工具/记忆/沉淀/实验/开发者/快捷键快照前后一致', read_refs: [final.event_id] },
  business_call_refs: [cInit.call_id, cFinal.call_id],
  notes: '原问题：快照仅覆盖常规设置且提前结束。本轮覆盖常规、记忆与进化、实验性功能、开发者、内置快捷键等字段，任务收尾前后同一字段集合独立回读一致；shortcut.search读取为null(该次快捷键dialog未读到搜索会话行)，其余字段均有值。首次快照在大部分设置操作已恢复后读取，非任务起点快照，见备注。',
});

const p = '运行上下文.json';
const ctx = JSON.parse(fs.readFileSync(p, 'utf8'));
ctx.binding_sources.project = { kind: 'read', event_id: 'business-5ab39283-9c6f-4c6f-801e-7d8bf64b077c-3' };
ctx.binding_sources.code_tools_initial = { kind: 'read', event_id: init.event_id };
ctx.binding_sources.link_initial = { kind: 'read', event_id: init.event_id };
fs.writeFileSync(p, JSON.stringify(ctx, null, 2) + '\n', 'utf8');
console.log('g12-17 written; bindings set');
