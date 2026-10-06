import { saveResult, callEvents, lastCall } from './results.mjs';

const call = lastCall('attachments.run');
const events = callEvents(call.call_id);
const R = (t) => events.filter((e) => e.target === t && e.kind === 'read');
const A = (t) => events.filter((e) => e.target === t && e.kind === 'action').map((e) => e.event_id);
const ENV = 'env-20261006-agent2';
const scroll = R('附件容器可滚动')[0];
const last = R('最后附件可见')[0];
const entry = R('附件清空入口')[0];
const after = R('清空后的草稿附件数')[0];

saveResult('G7-09', {
  environment_id: ENV, attempt_id: 'G7-09-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: '30附件草稿的附件容器',
  inputs: ['count-01..count-30.txt'],
  action_refs: A('添加30份附件'),
  actual_steps: ['添加30份附件', '读取附件容器横纵scroll/client与computed overflow', '沿成立的轴滚动到末端', '读取count-30.txt可见性'],
  assertions: [
    { id: 'G7-09-A1', actual: scroll.value, read_refs: [scroll.event_id] },
    { id: 'G7-09-A2', actual: last.value, read_refs: [last.event_id] },
  ],
  cleanup: { status: 'unchanged', description: '附件清理，未发送；无设置/资产变更', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：容器实际横向滚动而用例断言纵向高度。本轮读取横纵尺寸与computed overflow，按实际可滚轴滚动到末端，再验证count-30.txt可见。raw见日志。',
});

saveResult('G7-11', {
  environment_id: ENV, attempt_id: 'G7-11-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: '3附件草稿的附件工具区',
  inputs: ['attachment-a.txt', 'attachment-b.txt', 'attachment-c.md'],
  action_refs: A('添加3份附件'),
  actual_steps: ['添加3份附件', '读取附件工具区全部可见控件确认是否有批量清空', '无入口故未执行清空'],
  assertions: [
    { id: 'G7-11-A1', actual: entry.value, read_refs: [entry.event_id] },
    { id: 'G7-11-A2', actual: null, read_refs: [entry.event_id], reason: '附件工具区未发现批量清空入口，未执行清空，故不清空后数量', failed_dependency: 'G7-11-A1 清空入口' },
  ],
  cleanup: { status: 'unchanged', description: '附件未发送，草稿保留；无设置/资产变更', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：当前附件控件只有逐个删除，没有清空入口；未执行清空时的缓存数量3不是清空失败后的新读取。本轮读取附件工具区全部可见控件，未发现批量清空入口(A1=false)，故A2记为未观测(null)并说明依赖。控件清单见raw。',
});

console.log('g7 results written');
