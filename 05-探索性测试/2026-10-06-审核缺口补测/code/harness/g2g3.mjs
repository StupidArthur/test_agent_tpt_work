import { saveResult, callEvents } from './results.mjs';

const ENV = 'env-20261006-agent2';
const G2CALL = 'CALL-e125498c-c82d-42fe-8ffd-a8103f527c4c'; // fresh import of fast-assert-skillc-20261006-agent2
const G3CALL = 'CALL-7588ecf0-4872-4b54-950b-f445e6273b27'; // fresh import + first-read of default-state skill
const times = {
  G2: ['2026-10-06T08:31:55.323Z', '2026-10-06T08:32:51.742Z'],
  G3: ['2026-10-06T08:29:56.893Z', '2026-10-06T08:31:15.181Z'],
};
const ev = (call, target, kind) => callEvents(call).filter((e) => e.target === target && (!kind || e.kind === kind));
const first = (call, target, kind) => ev(call, target, kind)[0];
const last = (call, target, kind) => ev(call, target, kind).at(-1);

const g2events = callEvents(G2CALL);
const g3events = callEvents(G3CALL);
const g2Import = g2events.filter((e) => e.target === '提交单文件技能导入' && e.kind === 'action');
const g2Exists = first(G2CALL, '本轮技能卡', 'read');
const g2Title = first(G2CALL, '本轮技能标题', 'read');
const g3DefaultAction = g3events.filter((e) => e.target === '提交默认态技能导入' && e.kind === 'action');
const g3Switch = first(G3CALL, '刚导入技能开关', 'read');

saveResult('G2-02', {
  environment_id: ENV, attempt_id: 'G2-02-A02', started_at: times.G2[0], ended_at: times.G2[1],
  object_identity: 'fast-assert-skillc-20261006-agent2',
  inputs: ['夹具/基础/20261006-agent2/skill-c/SKILL.md'],
  action_refs: g2Import.map((e) => e.event_id),
  actual_steps: ['提交前读取技能安装目录身份集合', '选择单文件SKILL.md并点击导入', '读取导入反馈', '按内部name打开卡片详情核对身份'],
  assertions: [{ id: 'G2-02-A1', actual: g2Exists.value, read_refs: [g2Exists.event_id] }],
  cleanup: { status: 'retained', description: '本轮导入技能保留待审，未删除用户资产', read_refs: [] },
  business_call_refs: [G2CALL],
  notes: '原问题：对象已存在，同名跳过只能证明去重。本轮 preCheck 读数为 main_present=false，导入后详情内部name=fast-assert-skillc-20261006-agent2 且安装目录存在。',
});

saveResult('G2-03', {
  environment_id: ENV, attempt_id: 'G2-03-A02', started_at: times.G2[0], ended_at: times.G2[1],
  object_identity: 'fast-assert-skillc-20261006-agent2',
  inputs: [],
  action_refs: g2Import.map((e) => e.event_id),
  actual_steps: ['按内部name定位唯一卡片', '进入详情核对内部name后返回列表', '读取该卡片展示标题'],
  assertions: [{ id: 'G2-03-A1', actual: g2Title.value, read_refs: [g2Title.event_id] }],
  cleanup: { status: 'retained', description: '本轮导入技能保留待审', read_refs: [] },
  business_call_refs: [G2CALL],
  notes: '原问题：同名展示卡重复，first卡片未绑定内部身份。本轮遍历同标题卡片，逐张进入详情比对内部name后再读该卡片标题。',
});

saveResult('G3-01', {
  environment_id: ENV, attempt_id: 'G3-01-A02', started_at: times.G3[0], ended_at: times.G3[1],
  object_identity: 'fast-assert-default-20261006-agent2',
  inputs: ['夹具/基础/20261006-agent2/skill-default/SKILL.md'],
  action_refs: g3DefaultAction.map((e) => e.event_id),
  actual_steps: ['导入新的合法技能', '不点击任何开关，首次读取该技能卡片 aria-checked'],
  assertions: [{ id: 'G3-01-A1', actual: g3Switch.value, read_refs: [g3Switch.event_id] }],
  cleanup: { status: 'retained', description: '次轮导入技能保留待审（未停用，按计划G3后续处理）', read_refs: [] },
  business_call_refs: [G3CALL],
  notes: '原问题：读取前可能主动归一化且复用了已有技能。本轮使用全新身份 fast-assert-default-20261006-agent2，导入后不做任何切换立即读取 aria-checked=true（原始值见raw）。设计期望停用，此处按实测记录。',
});

console.log('g2g3 results written');
