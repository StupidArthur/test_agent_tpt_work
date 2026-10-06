import { saveResult, callEvents, lastCall } from './results.mjs';

const call = lastCall('skills.zip');
const events = callEvents(call.call_id);
const R = (t) => events.filter((e) => e.target === t && e.kind === 'read');
const A = (t) => events.filter((e) => e.target === t && e.kind === 'action').map((e) => e.event_id);
const ENV = 'env-20261006-agent2';

const idSet = R('正式技能身份集合');
const g1 = { selected: R('确认前已选择的本轮ZIP')[0] };
const rootDelta = R('根ZIP正式对象增量')[0];
const nested = R('内部嵌套技能拆成全局对象')[0];
const collection = R('最终确认后导入的集合内部名列表')[0];
const trash = R('安装目录垃圾文件')[0];
const h5 = R('已安装本轮root SKILL.md绝对路径');
const skip = R('最终确认后同名处理结果')[0];
const mixed = R('混合导入逐项结果')[0];
const invalidCount = R('混合导入无坏包正式卡')[0];

saveResult('G14-01', {
  environment_id: ENV, attempt_id: 'G14-01-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: 'root.zip导入弹窗', inputs: ['zips/root.zip（选择不确认）'],
  action_refs: A('选择root.zip不确认'),
  actual_steps: ['提交前读取正式身份集合', '在导入dialog选择root.zip且不点确认', '读取所选ZIP文件名', '读取正式身份集合'],
  assertions: [
    { id: 'G14-01-A1', actual: g1.selected.value, read_refs: [g1.selected.event_id] },
    { id: 'G14-01-A2', actual: { before: idSet[0].value, after: idSet[1].value }, read_refs: [idSet[0].event_id, idSet[1].event_id] },
  ],
  cleanup: { status: 'unchanged', description: '仅选择未确认，取消弹窗；正式注册表未变', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：选文件后无候选列表，正式注册表未变。本轮读取所选ZIP文件名为root.zip，并前后读取正式注册表键集合一致；候选列表是否展示另见raw。',
});

saveResult('G14-02', {
  environment_id: ENV, attempt_id: 'G14-02-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: 'fast-assert-root-20261006-agent2', inputs: ['zips/root.zip'],
  action_refs: A('确认导入root.zip'),
  actual_steps: ['提交前读取注册表确认root不存在', '确认导入root.zip', '读取root对象增量', '读取嵌套技术名全局匹配数'],
  assertions: [
    { id: 'G14-02-A1', actual: rootDelta.value, read_refs: [rootDelta.event_id] },
    { id: 'G14-02-A2', actual: nested.value, read_refs: [nested.event_id] },
  ],
  cleanup: { status: 'retained', description: '本轮root技能保留待审', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：提交前root身份已存在，0增量与同名跳过正常。本轮提交前root不存在，导入后增量=1；嵌套技术名全局匹配数=0。',
});

saveResult('G14-03', {
  environment_id: ENV, attempt_id: 'G14-03-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: 'collection.zip新导入对象内部名', inputs: ['zips/collection.zip'],
  action_refs: A('确认导入collection.zip'),
  actual_steps: ['提交前记录相关身份不存在', '确认导入collection.zip', '读取本包新增正式对象内部名并排序'],
  assertions: [{ id: 'G14-03-A1', actual: collection.value, read_refs: [collection.event_id] }],
  cleanup: { status: 'retained', description: '本轮导入对象保留待审', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：确认前弹窗只展示ZIP文件，不展示内部候选。本轮读取最终确认后的新增正式内部名。实际新增为["one"]（包内文件夹名），与期望的YAML技术名不一致；deep二级样本未导入（见raw）。',
});

saveResult('G14-04', {
  environment_id: ENV, attempt_id: 'G14-04-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: 'fast-assert-trash-20261006-agent2安装目录', inputs: ['zips/trash.zip'],
  action_refs: A('确认导入trash.zip'),
  actual_steps: ['确认导入trash.zip', '递归列安装目录检查.DS_Store与__MACOSX'],
  assertions: [{ id: 'G14-04-A1', actual: trash.value, read_refs: [trash.event_id] }],
  cleanup: { status: 'retained', description: '本轮导入对象保留待审（含垃圾文件）', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：安装目录确有.DS_Store和__MACOSX文件。本轮新垃圾包导入后递归列目录，实测仍含垃圾文件（true），文件清单见raw。',
});

saveResult('G14-05', {
  environment_id: ENV, attempt_id: 'G14-05-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: '已安装root技能重新导入', inputs: ['zips/root.zip（重复，默认确认）'],
  action_refs: A('重复提交root.zip默认确认'),
  actual_steps: ['保存已安装root SKILL.md哈希', '再次提交root.zip并点默认确认不覆盖', '读取确认后同名处理结果', '回读SKILL.md哈希'],
  assertions: [
    { id: 'G14-05-A1', actual: skip.value, read_refs: [skip.event_id] },
    { id: 'G14-05-A2', actual: { before: h5[0].value, after: h5[1].value }, read_refs: [h5[0].event_id, h5[1].event_id] },
  ],
  cleanup: { status: 'retained', description: '已安装root技能保持原样', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：确认前读取跳过字样阶段错误。本轮最终确认后读到反馈“已跳过同名技能”，并回读原SKILL.md哈希一致。',
});

saveResult('G14-06', {
  environment_id: ENV, attempt_id: 'G14-06-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: 'mixed.zip逐项结果', inputs: ['zips/mixed.zip'],
  action_refs: A('确认导入mixed.zip'),
  actual_steps: ['确认root已预装、valid/invalid未装', '提交mixed.zip并确认', '按技术名读取逐项状态与坏包正式匹配数'],
  assertions: [
    { id: 'G14-06-A1', actual: mixed.value, read_refs: [mixed.event_id] },
    { id: 'G14-06-A2', actual: invalidCount.value, read_refs: [invalidCount.event_id] },
  ],
  cleanup: { status: 'retained', description: '本轮导入对象保留待审', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：反馈为duplicate/invalid/valid均被同名跳过。本轮提交前仅root预装，mixed反馈为“已跳过同名技能：duplicate、invalid、valid”，valid未成功（有效项内部名按包内文件夹名回落为valid，与既有valid目录同名）。坏包正式匹配数=0。dialog原文见raw。',
});

console.log('g14 results written');
