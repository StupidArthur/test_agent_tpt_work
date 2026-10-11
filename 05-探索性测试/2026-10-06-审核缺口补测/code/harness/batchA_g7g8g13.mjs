import { saveBatchResult, callEvents } from './batchA.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const calls = fs.readFileSync(path.join(root, '运行日志', '业务调用.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const last = (fn) => calls.filter((c) => c.function_name === fn).at(-1);
const ENV = 'env-20261006-agent2';
const R = (ev, t) => ev.filter((e) => e.target === t && e.kind === 'read')[0];
const A = (ev, t) => ev.filter((e) => e.target === t && e.kind === 'action').map((e) => e.event_id);

// G13-10
{
  const call = last('batchA.cnAll'); const ev = callEvents(call.call_id);
  const read = R(ev, '卡片详情对象身份');
  saveBatchResult('G13-10', {
    environment_id: ENV, attempt_id: 'G13-10-A02', started_at: call.started_at, ended_at: call.ended_at,
    object_identity: 'fast-assert-cn-all-20261006-agent2', inputs: ['variants/cn-all/SKILL.md'],
    action_refs: A(ev, '导入cn-all单文件'),
    actual_steps: ['导入cn-all单文件样本', '按内部name定位本轮卡片并点击卡片主体', '按YAML字段语义读取详情name并比较'],
    assertions: [{ id: 'G13-10-A1', actual: read.value, read_refs: [read.event_id] }],
    cleanup: { status: 'retained', description: '本轮导入对象保留待审', read_refs: [] },
    business_call_refs: [call.call_id],
    notes: '原问题：原始详情name带引号，严格比较未解析引号导致false。本轮遍历同标题卡片按内部name定位，再点击卡片主体打开详情，读取原始name字段并去引号后比较。',
  });
}

// G7-12
{
  const call = last('batchA.attachmentSend'); const ev = callEvents(call.call_id);
  const name = R(ev, '已发送气泡附件'); const del = R(ev, '已发送附件删除入口');
  saveBatchResult('G7-12', {
    environment_id: ENV, attempt_id: 'G7-12-A02', started_at: call.started_at, ended_at: call.ended_at,
    object_identity: '本轮已发送用户消息附件区', inputs: ['attachment-a.txt', '确认附件已收到'],
    action_refs: [...A(ev, '添加附件attachment-a.txt'), ...A(ev, '发送附件请求')],
    actual_steps: ['添加attachment-a.txt', '发送附件请求并等待终态', '仅在该条已发送用户气泡内读取名称与删除控件'],
    assertions: [
      { id: 'G7-12-A1', actual: name.value, read_refs: [name.event_id] },
      { id: 'G7-12-A2', actual: del.value, read_refs: [del.event_id] },
    ],
    cleanup: { status: 'unchanged', description: '已发送消息保留，无设置/资产变更', read_refs: [] },
    business_call_refs: [call.call_id],
    notes: '原问题：所谓用户气泡原文包含助手与编辑器。本轮限定本条已发送用户消息节点读取：含attachment-a.txt，且无移除/删除控件。',
  });
}

// G8-07 + G8-10
{
  const call = last('batchA.trace'); const ev = callEvents(call.call_id);
  const scroll = R(ev, '工具输出内部滚动'); const output = R(ev, '实际read输出末行'); const nest = R(ev, '单read多层聚合');
  saveBatchResult('G8-07', {
    environment_id: ENV, attempt_id: 'G8-07-A02', started_at: call.started_at, ended_at: call.ended_at,
    object_identity: '本轮长行文件读取工具步骤输出容器', inputs: ['读取 long.txt'],
    action_refs: A(ev, '发起长行文件读取'),
    actual_steps: ['发起long.txt读取并等待终态', '展开该工具步骤', '读取输出容器尺寸与overflow', '读取完整输出文本'],
    assertions: [
      { id: 'G8-07-A1', actual: scroll.value, read_refs: [scroll.event_id] },
      { id: 'G8-07-A2', actual: output.value, read_refs: [output.event_id] },
    ],
    cleanup: { status: 'unchanged', description: '本轮会话保留，无设置/资产变更', read_refs: [] },
    business_call_refs: [call.call_id],
    notes: '原问题：输出选择器没有找到对象。本轮定位到 [data-slot="tool.call.toolview"] 内 [class*="readBody"] 输出容器：scrollHeight=clientHeight=239、overflow visible，未产生内部滚动(A1=false)；但存在“展开其余 192 行”控件说明是按行折叠而非滚动容器。完整输出含 FAST_LONG_LINE_200(A2通过)。',
  });
  saveBatchResult('G8-10', {
    environment_id: ENV, attempt_id: 'G8-10-A02', started_at: call.started_at, ended_at: call.ended_at,
    object_identity: '本轮单次read工具记录', inputs: ['单次读取 flow.txt'],
    action_refs: A(ev, '单次读取flow.txt'),
    actual_steps: ['另建独立任务只成功读取一次文件', '在该次工具记录检查父子节点是否有多层同类聚合嵌套'],
    assertions: [{ id: 'G8-10-A1', actual: nest.value, read_refs: [nest.event_id] }],
    cleanup: { status: 'unchanged', description: '本轮会话保留，无设置/资产变更', read_refs: [] },
    business_call_refs: [call.call_id],
    notes: '原问题：复用写盘任务且只数全页group数量。本轮独立单次读取：tool view 数=1、无嵌套 tool view、disclosure 深度=1，未出现至少两层同类聚合嵌套。',
  });
}

console.log('G13-10/G7-12/G8-07/G8-10 results written');
