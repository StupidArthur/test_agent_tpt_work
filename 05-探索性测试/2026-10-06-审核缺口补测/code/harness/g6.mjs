import { saveResult, callEvents, lastCall } from './results.mjs';
import fs from 'node:fs';

const call = lastCall('settings.permission');
const events = callEvents(call.call_id);
const R = (t) => events.filter((e) => e.target === t && e.kind === 'read');
const A = (t) => events.filter((e) => e.target === t && e.kind === 'action').map((e) => e.event_id);
const ENV = 'env-20261006-agent2';
const initial = R('常规设置默认权限')[0];
const reopen = R('重开后默认权限设置')[0];
const new1 = R('改后新空白任务权限')[0];
const restored = R('恢复后默认权限设置')[0];
const new2 = R('恢复后另一个新任务权限')[0];

saveResult('G6-06', {
  environment_id: ENV, attempt_id: 'G6-06-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: '默认权限设置 + 新建任务composer权限控件',
  inputs: ['默认权限=工作区内修改', '恢复为初值'],
  action_refs: [...A('设为工作区内修改'), ...A('创建改后新任务'), ...A('恢复默认权限初值'), ...A('创建恢复后新任务')],
  actual_steps: ['读取默认权限初值', '设为工作区内修改并重开回读', '从新建入口创建独立新会话并读取composer权限', '恢复初值重开回读', '再创建新会话读取composer权限'],
  assertions: [
    { id: 'G6-06-A1', actual: new1.value, read_refs: [new1.event_id] },
    { id: 'G6-06-A2', actual: restored.value, read_refs: [restored.event_id] },
    { id: 'G6-06-A3', actual: new2.value, read_refs: [new2.event_id] },
  ],
  cleanup: { status: 'restored', description: '默认权限已恢复并重开回读为初值工作区内修改', read_refs: [restored.event_id] },
  business_call_refs: [call.call_id],
  notes: '原问题：设置恢复为工作区内修改后新建界面显示仅可查看，保留继承差异候选。本轮在同一包(0.2.0-rc.1)下：初值=工作区内修改，设为工作区内修改并重开确认，改后新任务composer权限实测=工作区内修改（未复现“仅可查看”），恢复后另一新任务=工作区内修改。未在同一环境复现旧差异，不做“已修复”结论。',
});

// fix context permission_initial binding
const p = '运行上下文.json';
const ctx = JSON.parse(fs.readFileSync(p, 'utf8'));
ctx.binding_sources.permission_initial = { kind: 'read', event_id: initial.event_id };
fs.writeFileSync(p, JSON.stringify(ctx, null, 2) + '\n', 'utf8');
console.log('g6 result written; permission_initial binding ->', initial.event_id);
