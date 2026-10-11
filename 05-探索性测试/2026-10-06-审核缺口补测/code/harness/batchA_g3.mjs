import { saveBatchResult, callEvents } from './batchA.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const calls = fs.readFileSync(path.join(root, '运行日志', '业务调用.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const callRec = calls.filter((c) => c.function_name === 'batchA.skillUse').at(-1);
const call = callRec.call_id;
const ev = callEvents(call);
const R = (t) => ev.filter((e) => e.target === t && e.kind === 'read')[0];
const A = (t) => ev.filter((e) => e.target === t && e.kind === 'action').map((e) => e.event_id);
const ENV = 'env-20261006-agent2';
const before = R('此前活动会话身份');
const chip = R('新会话技能引用');
const after = R('调用会话身份');
const reply = R('本轮助手正文');
const trace = R('本轮调用Trace');

saveBatchResult('G3-03', {
  environment_id: ENV, attempt_id: 'G3-03-A03', started_at: callRec.started_at, ended_at: callRec.ended_at,
  object_identity: 'fast-assert-skillc-20261006-agent2 + 调用session',
  inputs: ['技能详情点击使用', '请执行本技能的固定回复规则'],
  action_refs: A('技能详情点击使用'),
  actual_steps: ['新建空任务作为当前活动会话', '在技能详情点击使用', '读取composer技能chip内部name', '发送无害请求并回读会话身份'],
  assertions: [
    { id: 'G3-03-A1', actual: chip.value, read_refs: [chip.event_id] },
    { id: 'G3-03-A2', actual: { before: before.value, after: after.value }, read_refs: [before.event_id, after.event_id] },
  ],
  cleanup: { status: 'retained', description: '本轮会话与技能引用保留待审；技能随后停用', read_refs: [] },
  business_call_refs: [call],
  notes: '原问题：点击使用后又手动newTask并输入斜杠文本覆盖入口效果。本轮只点击使用并读取chip与session：chip=fast-assert-skillc-20261006-agent2(A1通过)；入口把技能引用加入当前任务，发送后会话身份仍等于使用前会话(A2 different=false)。',
});

saveBatchResult('G3-04', {
  environment_id: ENV, attempt_id: 'G3-04-A03', started_at: callRec.started_at, ended_at: callRec.ended_at,
  object_identity: 'fast-assert-skillc-20261006-agent2 + 调用session',
  inputs: ['请执行本技能的固定回复规则'],
  action_refs: A('发送技能无害请求'),
  actual_steps: ['使用技能后发送无害请求并等待终态', '在本轮轨迹读取引用该技能及其指令正文的记录', '助手正文单独读取'],
  assertions: [
    { id: 'G3-04-A1', actual: trace.value, read_refs: [trace.event_id], ...(trace.value === null ? { reason: '未在当前会话轨迹中判读到技能加载记录', failed_dependency: '技能加载记录可见性' } : {}) },
  ],
  cleanup: { status: 'retained', description: '本轮会话保留待审；助手正文 FAST_SKILL_EXEC_OK 见raw', read_refs: [reply.event_id] },
  business_call_refs: [call],
  notes: '原问题：全页名称不等于资源注入。本轮限定本轮session轨迹读取到引用技能内部name并复述技能指令正文的记录；助手正文单独读取为 FAST_SKILL_EXEC_OK。',
});

console.log('G3 results written from call', call);
