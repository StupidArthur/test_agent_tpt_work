import { saveResult } from './results.mjs';

const CALL = 'CALL-dac552e6-620d-429f-906d-a0925f38e8f3';
const ENV = 'env-20261006-agent2';
const S = '2026-10-06T08:16:56.436Z';
const E = '2026-10-06T08:17:26.051Z';
const P = 'business-5ab39283-9c6f-4c6f-801e-7d8bf64b077c';
const common = { environment_id: ENV, started_at: S, ended_at: E, business_call_refs: [CALL] };

saveResult('G1-03', {
  ...common, attempt_id: 'G1-03-A02',
  object_identity: '本轮任务session id与composer项目控件',
  inputs: ['从已有项目列表选择 tpt-workspace'],
  action_refs: [`${P}-2`],
  actual_steps: ['新建任务', '点击composer项目选择器', '从已有项目菜单选择tpt-workspace', '回读项目控件'],
  assertions: [{ id: 'G1-03-A1', actual: 'tpt-workspace', read_refs: [`${P}-3`] }],
  cleanup: { status: 'unchanged', description: '仅选择已有项目，未新增或修改项目', read_refs: [] },
  notes: '原问题：只读项目标题未执行选择。本轮实际点击项目选择器并从已有项目菜单选择，回读控件文本。菜单项含 tpt-workspace 与「新建项目…」。',
});

saveResult('G1-06', {
  ...common, attempt_id: 'G1-06-A02',
  object_identity: 'session-333f2e2d-3f3f-450d-8011-251b7de6efd4',
  inputs: ['只回答：FAST_CHAT_OK'],
  action_refs: [`${P}-5`],
  actual_steps: ['选择已有项目', '发送纯文本请求并等待终态', '确认目标会话chat区域存在', '在目标会话范围内统计文件产物元素'],
  assertions: [{ id: 'G1-06-A1', actual: 0, read_refs: [`${P}-8`] }],
  cleanup: { status: 'retained', description: '本轮新增纯文本会话保留待审，无设置或资产变更', read_refs: [] },
  notes: '原问题：全页启发式计数不能证明目标会话无产物。本轮先读取目标会话chat区域存在(count=1)，再限定该区域统计文件产物元素；助手正文为 FAST_CHAT_OK，读取值见日志。',
});

saveResult('G1-08', {
  ...common, attempt_id: 'G1-08-A02',
  object_identity: 'session-6282bf58-12ec-47cf-a0c0-c6320a7fd190',
  inputs: ['用一个代码块输出字母A和B，每行一个，不要其他内容。'],
  action_refs: [`${P}-12`],
  actual_steps: ['新建任务并选择已有项目', '发送代码块请求并等待终态', '读取目标会话chat区域内文件产物元素'],
  assertions: [{ id: 'G1-08-A1', actual: 0, read_refs: [`${P}-14`] }],
  cleanup: { status: 'retained', description: '本轮新增代码块会话保留待审，无设置或资产变更', read_refs: [] },
  notes: '原问题：产物计数来自未经验证的全页启发式选择器。本轮目标会话代码块读取为 A\\nB（见日志-13），产物统计限定该会话 chat 区域。',
});

console.log('g1 results written');
