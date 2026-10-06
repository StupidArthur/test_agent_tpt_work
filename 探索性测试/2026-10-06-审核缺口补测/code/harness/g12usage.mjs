import { saveResult, callEvents, lastCall } from './results.mjs';
import fs from 'node:fs';

const call = lastCall('settings.usage');
const events = callEvents(call.call_id);
const R = (t) => events.filter((e) => e.target === t && e.kind === 'read');
const A = (t) => events.filter((e) => e.target === t && e.kind === 'action').map((e) => e.event_id);
const ENV = 'env-20261006-agent2';
const initial = R('性能与用量设置初值')[0];
const simpleA1 = R('简洁页脚轮次步骤token总量')[0];
const simpleA2 = R('简洁页脚基本用量')[0];
const detailedA1 = R('详细页脚字段')[0];
const restored = R('恢复后的用量设置')[0];

saveResult('G12-02', {
  environment_id: ENV, attempt_id: 'G12-02-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: '性能与用量设置 + 本轮回复性能页脚',
  inputs: ['性能与用量=简洁'],
  action_refs: A('切换用量为简洁'),
  actual_steps: ['记录用量初值详细', '切换为简洁并重开回读', '新建会话发送请求等待终态', '在真正性能页脚读取详细字段与基本字段', '恢复初值'],
  assertions: [
    { id: 'G12-02-A1', actual: simpleA1.value, read_refs: [simpleA1.event_id] },
    { id: 'G12-02-A2', actual: simpleA2.value, read_refs: [simpleA2.event_id] },
  ],
  cleanup: { status: 'restored', description: '用量设置已恢复为初值详细', read_refs: [restored.event_id] },
  business_call_refs: [call.call_id],
  notes: '原问题：页脚读到全页style源码，判据同时要求tok/s存在与tok不存在。本轮限定TS9iAW_root页脚读取：简洁档下轮/步/token总量均隐藏(A1=true)，且未见tok/s或百分比基本字段(A2=false)。模型本轮未产生工具步骤(可能因记忆注入拒绝执行文件读取)，基本速度字段缺失可能与本轮回复无步骤有关，页面原文见raw。',
});

saveResult('G12-03', {
  environment_id: ENV, attempt_id: 'G12-03-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: '性能与用量设置 + 本轮回复性能页脚',
  inputs: ['性能与用量=详细'],
  action_refs: A('切换用量为详细'),
  actual_steps: ['切换为详细', '在本轮会话性能页脚读取轮数/步数/token字段', '恢复初值重开回读'],
  assertions: [
    { id: 'G12-03-A1', actual: detailedA1.value, read_refs: [detailedA1.event_id] },
    { id: 'G12-03-A2', actual: restored.value, read_refs: [restored.event_id] },
  ],
  cleanup: { status: 'restored', description: '用量设置已恢复为初值详细并回读', read_refs: [restored.event_id] },
  business_call_refs: [call.call_id],
  notes: '原问题：全页正则命中style或旧内容。本轮限定TS9iAW_root页脚：详细档实测只显示“用量 XX tok”，未见轮次/步骤字段(A1=false)，可能与模型未产生工具步骤有关；恢复后设置为详细(A2通过)。',
});

const p = '运行上下文.json';
const ctx = JSON.parse(fs.readFileSync(p, 'utf8'));
ctx.binding_sources.usage_initial = { kind: 'read', event_id: initial.event_id };
fs.writeFileSync(p, JSON.stringify(ctx, null, 2) + '\n', 'utf8');
console.log('g12usage results written; usage_initial ->', initial.event_id);
