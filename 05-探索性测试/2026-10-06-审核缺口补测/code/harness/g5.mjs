import { saveResult, callEvents, lastCall } from './results.mjs';

const call = lastCall('experts.importBad');
const events = callEvents(call.call_id);
const reads = (t) => events.filter((e) => e.target === t && e.kind === 'read');
const actions = (t) => events.filter((e) => e.target === t && e.kind === 'action').map((e) => e.event_id);
const ENV = 'env-20261006-agent2';

const cnt = reads('专家列表数量');
const fb7 = reads('缺文件包提交反馈')[0];
const fb8 = reads('坏JSON提交反馈')[0];
const meta = reads('坏包源metadata.json绝对路径');
const agent = reads('坏包源agent.md绝对路径');

saveResult('G5-07', {
  environment_id: ENV, attempt_id: 'G5-07-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: '缺agent.md的专家目录（夹具/基础/20261006-agent2/expert-missing-agent）',
  inputs: ['expert-missing-agent目录'],
  action_refs: actions('提交缺文件包'),
  actual_steps: ['记录提交前专家列表数量', '选择缺agent.md目录并点击提交', '等待并读取本次可见错误反馈', '关闭弹窗并读取提交后列表数量'],
  assertions: [
    { id: 'G5-07-A1', actual: fb7.value, read_refs: [fb7.event_id], ...(fb7.value === null ? { reason: '提交未完成或读取失败', failed_dependency: 'experts.importBad提交步骤' } : {}) },
    { id: 'G5-07-A2', actual: { before: cnt[0].value, after: cnt[1].value }, read_refs: [cnt[0].event_id, cnt[1].event_id] },
  ],
  cleanup: { status: 'retained', description: '坏包源目录只读未变；未产生新正式对象', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：弹窗未关闭与列表未变不是明确拒绝。本轮读取到本次提交后的可见反馈原文：“所选内容不是有效的专家包：需要包含 agent.md 与 metadata.json。”，明确指出缺 agent.md。',
});

saveResult('G5-08', {
  environment_id: ENV, attempt_id: 'G5-08-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: '坏metadata.json的专家目录（夹具/基础/20261006-agent2/expert-bad-json）',
  inputs: ['expert-bad-json目录'],
  action_refs: actions('提交坏JSON包'),
  actual_steps: ['记录源元数据哈希与提交前专家列表数量', '选择坏metadata.json目录并点击提交', '等待并读取本次可见错误反馈', '关闭弹窗并读取列表数量与源文件哈希'],
  assertions: [
    { id: 'G5-08-A1', actual: fb8.value, read_refs: [fb8.event_id], ...(fb8.value === null ? { reason: '提交未完成或读取失败', failed_dependency: 'experts.importBad提交步骤' } : {}) },
    { id: 'G5-08-A2', actual: { before: cnt[2].value, after: cnt[3].value }, read_refs: [cnt[2].event_id, cnt[3].event_id] },
    { id: 'G5-08-A3', actual: { before: meta[0].value, after: meta[1].value }, read_refs: [meta[0].event_id, meta[1].event_id] },
    { id: 'G5-08-A4', actual: { before: agent[0].value, after: agent[1].value }, read_refs: [agent[0].event_id, agent[1].event_id] },
  ],
  cleanup: { status: 'retained', description: '坏包源文件哈希前后一致；未产生新正式对象', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：弹窗仍在加哈希未变不能证明格式拒绝。本轮读取到本次提交后的可见反馈原文（含 metadata.json 与结构校验），并回读源文件SHA256一致。反馈为通用结构校验文案而非JSON语法错误细节，原文见raw。',
});

console.log('g5 results written');
