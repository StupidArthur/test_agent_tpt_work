import { saveBatchResult, callEvents } from './batchA.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const calls = fs.readFileSync(path.join(root, '运行日志', '业务调用.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const last = (fn) => calls.filter((c) => c.function_name === fn).at(-1);
const ENV = 'env-20261006-agent2';
const R = (ev, t) => ev.filter((e) => e.target === t && e.kind === 'read');
const A = (ev, t) => ev.filter((e) => e.target === t && e.kind === 'action').map((e) => e.event_id);

// G8-08
{
  const call = last('batchA.deliver'); const ev = callEvents(call.call_id);
  const file = R(ev, '实际deliver.txt文件内容')[0];
  const derived = callEvents(call.call_id).length ? null : null;
  // derived product-card read is in business.jsonl without business_call_id; fetch by target
  const all = fs.readFileSync(path.join(root, '运行日志', 'business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const cardDerived = all.filter((e) => e.target === '当前任务产物文件身份(派生)' && e.kind === 'read').at(-1);
  saveBatchResult('G8-08', {
    environment_id: ENV, attempt_id: 'G8-08-A02', started_at: call.started_at, ended_at: call.ended_at,
    object_identity: '本轮工作目录deliver.txt + 会话产物文件卡',
    inputs: ['创建 deliver.txt=FAST_DELIVER_OK'],
    action_refs: A(ev, '请求生成本轮文件'),
    actual_steps: ['选定已有项目并请求生成本轮文件', '读取执行终态与助手回复', '独立读取目标文件内容', '在会话产物文件卡核对资源绝对路径'],
    assertions: [
      { id: 'G8-08-A1', actual: file.value, read_refs: [file.event_id] },
      { id: 'G8-08-A2', actual: cardDerived.value, read_refs: [cardDerived.event_id], reason: '未找到带实际资源绝对路径的产物卡，仅有工具步骤内相对路径fileLink(deliver.txt)，无法与绝对路径比较', failed_dependency: '产物卡资源路径可见性' },
    ],
    cleanup: { status: 'retained', description: 'deliver.txt 与本轮会话保留待审', read_refs: [] },
    business_call_refs: [call.call_id],
    notes: '原问题：文件确实未生成，产物卡读数来自用户请求文字。本轮文件实际生成内容=FAST_DELIVER_OK(A1通过)；会话内仅见工具步骤fileLink(相对路径)而无独立产物卡及绝对资源路径，A2无法比较记未观测。',
  });
}

// G14-06
{
  const call = last('batchA.mixed'); const ev = callEvents(call.call_id);
  const pre = R(ev, '混合包前提核验')[0];
  const statusRead = R(ev, '混合导入逐项结果')[0];
  const invalid = R(ev, '混合导入无坏包正式匹配数')[0];
  const all = fs.readFileSync(path.join(root, '运行日志', 'business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const statusDerived = all.filter((e) => e.target === '混合导入逐项结果(派生)' && e.kind === 'read').at(-1);
  saveBatchResult('G14-06', {
    environment_id: ENV, attempt_id: 'G14-06-A02', started_at: call.started_at, ended_at: call.ended_at,
    object_identity: 'mixed2.zip：dup(已装root)/valid(新)/invalid(缺字段新)',
    inputs: ['zips/mixed2.zip'],
    action_refs: A(ev, '提交mixed2.zip'),
    actual_steps: ['制作目录名与声明名一致的mixed2.zip', '提交前读取注册表与技能目录，确认仅重复项root存在', '提交并确认导入', '读取反馈与提交后注册表/目录逐项身份'],
    assertions: [
      { id: 'G14-06-A1', actual: statusDerived.value, read_refs: [statusDerived.event_id] },
      { id: 'G14-06-A2', actual: invalid.value, read_refs: [invalid.event_id] },
    ],
    cleanup: { status: 'retained', description: '本轮新增 valid/invalid 与已存在 root 保留待审', read_refs: [] },
    business_call_refs: [call.call_id],
    notes: '原问题：duplicate/invalid/valid均被同名跳过，未测到部分成功隔离。本轮改用目录名与声明名一致的 ew mixed2.zip：提交前仅 fast-assert-root-20261006-agent2 存在；导入后 fast-assert-mixed-valid-20261006-agent2、fast-assert-mixed-invalid-20261006-agent2 均新增注册(判成功)，root 前后存在但本次无针对root的明确跳过反馈，按纠错要求不据前后存在推定跳过，记null。缺description的invalid未被拒绝，正式匹配数=2。',
  });
}

console.log('G8-08 / G14-06 written');
