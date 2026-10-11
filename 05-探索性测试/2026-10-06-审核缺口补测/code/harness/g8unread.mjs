import { saveResult, callEvents, lastCall } from './results.mjs';

const call = lastCall('sessions.unread');
const events = callEvents(call.call_id);
const R = (t) => events.filter((e) => e.target === t && e.kind === 'read');
const A = (t) => events.filter((e) => e.target === t && e.kind === 'action').map((e) => e.event_id);
const ENV = 'env-20261006-agent2';
const unread = R('A完成未读提醒数')[0];
const extra = R('A重复独立未读标记数')[0];
const after = R('A未读提醒')[0];
const history = R('A历史正文可访问')[0];

saveResult('G8-02', {
  environment_id: ENV, attempt_id: 'G8-02-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: '会话A（本轮新增）',
  inputs: ['只回答：UNREAD_OK'],
  action_refs: A('进入会话A'),
  actual_steps: ['创建会话A与对照B', '为A建立明确未读标记', '进入同一A', '回读A未读提醒与历史正文'],
  assertions: [
    { id: 'G8-02-A1', actual: after.value, read_refs: [after.event_id] },
    { id: 'G8-02-A2', actual: history.value, read_refs: [history.event_id] },
  ],
  cleanup: { status: 'retained', description: '本轮新增会话保留待审；未删除消息', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：进入前没有可靠未读基线，dotState为null被算成0。本轮先标记A为未读，进入A后回读该行状态：未读提醒数量=0，历史助手正文非空。',
});

saveResult('G8-03', {
  environment_id: ENV, attempt_id: 'G8-03-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: '会话A（本轮新增）',
  inputs: ['标记A为未读'],
  action_refs: A('标记A为未读'),
  actual_steps: ['对本轮会话A执行标记为未读', '读取该行未读标记原文、属性与数量', '按未读语义解码'],
  assertions: [
    { id: 'G8-03-A1', actual: unread.value, read_refs: [unread.event_id] },
    { id: 'G8-03-A2', actual: extra.value, read_refs: [extra.event_id] },
  ],
  cleanup: { status: 'retained', description: '会话保留；未读标记已由后续进入会话清除', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：原文“未读：空闲”，dotState=idle被错算成0。本轮按行状态区语义解码：状态区含“未读”记1，dot元素数1且无并列额外标记记0。原始状态文本与data-state见raw。',
});

console.log('g8 unread results written');
