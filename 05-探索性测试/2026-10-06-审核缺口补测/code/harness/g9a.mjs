import { saveResult, callEvents, loadCalls } from './results.mjs';

const ENV = 'env-20261006-agent2';
const calls = loadCalls().filter((c) => c.function_name === 'skills.rejectMissingField');
const c7 = calls[1]; // directory missing-name (valid)
const c8 = calls[0]; // single-file missing-description (fresh)
const e7 = callEvents(c7.call_id);
const e8 = callEvents(c8.call_id);
const byId = (arr, suffix) => arr.find((e) => e.event_id.endsWith('-' + suffix));
const acts = (arr, t) => arr.filter((e) => e.target === t && e.kind === 'action').map((e) => e.event_id);

saveResult('G9-07', {
  environment_id: ENV, attempt_id: 'G9-07-A02', started_at: c7.started_at, ended_at: c7.ended_at,
  object_identity: '唯一目录名缺name技能（variants/missing-name-dir）',
  inputs: ['夹具/本轮/20261006-agent2/variants/missing-name-dir'],
  action_refs: acts(e7, '提交缺name技能目录'),
  actual_steps: ['提交前读取技能安装目录身份集合', '导入唯一目录名的缺name样本', '读取本次导入反馈', '提交后回读身份集合'],
  assertions: [
    { id: 'G9-07-A1', actual: byId(e7, 4).value, read_refs: [byId(e7, 4).event_id] },
    { id: 'G9-07-A2', actual: { before: byId(e7, 1).value, after: byId(e7, 5).value }, read_refs: [byId(e7, 1).event_id, byId(e7, 5).event_id] },
  ],
  cleanup: { status: 'retained', description: '本轮导入对象保留待审', read_refs: [] },
  business_call_refs: [c7.call_id],
  notes: '原问题：此前反馈为“已跳过同名uploaded-skill”，未测到缺name校验。本轮用唯一目录名 missing-name-dir 保留 name 缺失；导入弹窗关闭且安装目录多出一项（63→64），未出现缺name拒绝反馈。上一attempt（单文件 SKILL.md 缺name）反馈为“已跳过同名技能：uploaded-skill”，仅作对照，保留在历史。',
});

saveResult('G9-08', {
  environment_id: ENV, attempt_id: 'G9-08-A02', started_at: c8.started_at, ended_at: c8.ended_at,
  object_identity: '缺description技能（variants/missing-description）',
  inputs: ['夹具/本轮/20261006-agent2/variants/missing-description/SKILL.md'],
  action_refs: acts(e8, '提交缺description技能'),
  actual_steps: ['提交前读取技能安装目录身份集合', '导入缺技术description的新身份样本', '读取本次导入反馈', '提交后回读身份集合'],
  assertions: [
    { id: 'G9-08-A1', actual: byId(e8, 9).value, read_refs: [byId(e8, 9).event_id] },
    { id: 'G9-08-A2', actual: { before: byId(e8, 6).value, after: byId(e8, 10).value }, read_refs: [byId(e8, 6).event_id, byId(e8, 10).event_id] },
  ],
  cleanup: { status: 'retained', description: '本轮导入对象保留待审', read_refs: [] },
  business_call_refs: [c8.call_id],
  notes: '原问题：样本提交前已存在且被同名跳过。本轮使用尚未安装的新身份 fast-assert-missing-description-20261006-agent2，导入后弹窗关闭、身份集合 62→63（新增正式对象），未出现缺description拒绝反馈。后续attempt因同名跳过，仅作对照。',
});

console.log('g9a results written');
