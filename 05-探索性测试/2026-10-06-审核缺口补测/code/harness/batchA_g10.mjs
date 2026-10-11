import { saveBatchResult, callEvents } from './batchA.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const calls = fs.readFileSync(path.join(root, '运行日志', '业务调用.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const last = (fn) => calls.filter((c) => c.function_name === fn).at(-1);
const ENV = 'env-20261006-agent2';
const R = (ev, t) => ev.filter((e) => e.target === t && e.kind === 'read')[0];
const A = (ev, t) => ev.filter((e) => e.target === t && e.kind === 'action').map((e) => e.event_id);

// G10-03 / G10-05 from richDetail
{
  const call = last('batchA.richDetail'); const ev = callEvents(call.call_id);
  const collapsed = R(ev, '收起后的深层节点可见');
  const expanded = R(ev, '恢复展开深层节点可见');
  const preview = R(ev, '包内图片预览加载');
  saveBatchResult('G10-03', {
    environment_id: ENV, attempt_id: 'G10-03-A02', started_at: call.started_at, ended_at: call.ended_at,
    object_identity: 'fast-assert-rich-20261006-agent2 详情文件树', inputs: [],
    action_refs: A(ev, '打开rich技能详情').concat(A(ev, '展开references到checklist.md')).concat(A(ev, '收起references')).concat(A(ev, '重新展开references')),
    actual_steps: ['打开rich详情', '展开references/handbook/advanced', '收起references读取checklist.md树节点', '重新展开读取同一节点'],
    assertions: [
      { id: 'G10-03-A1', actual: collapsed.value, read_refs: [collapsed.event_id] },
      { id: 'G10-03-A2', actual: expanded.value, read_refs: [expanded.event_id] },
    ],
    cleanup: { status: 'unchanged', description: '仅查看详情，无设置/资产变更', read_refs: [] },
    business_call_refs: [call.call_id],
    notes: '原问题：折叠判断扫描整个详情，预览标题也叫checklist.md。本轮仅在文件树内以叶节点定位checklist.md并读其offsetWidth：收起references后不可见(false)，重新展开后可见(true)。',
  });
  saveBatchResult('G10-05', {
    environment_id: ENV, attempt_id: 'G10-05-A02', started_at: call.started_at, ended_at: call.ended_at,
    object_identity: 'fast-assert-rich-20261006-agent2 详情图片预览区', inputs: [],
    action_refs: A(ev, '点击assets/icon.png图片样本'),
    actual_steps: ['在rich文件树点击assets/icon.png', '定位当前预览区img并读取加载状态'],
    assertions: [{ id: 'G10-05-A1', actual: preview.value, read_refs: [preview.event_id] }],
    cleanup: { status: 'unchanged', description: '仅查看详情，无设置/资产变更', read_refs: [] },
    business_call_refs: [call.call_id],
    notes: '原问题：读取详情所有图片并挑任意已加载图片，可能命中图标。本轮在文件树点击assets/icon.png后，限定详情非svg预览img读取complete与naturalWidth。',
  });
}

// G10-07 / G10-09 from externalModify
{
  const call = last('batchA.externalModify'); const ev = callEvents(call.call_id);
  const hb = R(ev, '本轮实际安装SKILL.md绝对路径');
  const ha = ev.filter((e) => e.target === '本轮实际安装SKILL.md绝对路径' && e.kind === 'read')[1];
  const reply = R(ev, '合法修改后的新任务正文');
  const res = R(ev, '新任务加载技能资源内容');
  const tag = R(ev, '本轮卡片已本地修改标签');
  saveBatchResult('G10-07', {
    environment_id: ENV, attempt_id: 'G10-07-A02', started_at: call.started_at, ended_at: call.ended_at,
    object_identity: 'fast-assert-rich-20261006-agent2 安装SKILL.md', inputs: ['外部修改 FAST_RICH_BASE_OK->FAST_RICH_NEW_OK'],
    action_refs: [...A(ev, '外部合法修改SKILL.md'), ...A(ev, '调用rich技能'), ...A(ev, '恢复SKILL.md')],
    actual_steps: ['保存SKILL.md哈希', '外部合法修改并启用技能', '调用技能读取正文与轨迹加载记录', '恢复SKILL.md并回读哈希'],
    assertions: [
      { id: 'G10-07-A1', actual: reply.value, read_refs: [reply.event_id] },
      { id: 'G10-07-A2', actual: res.value, read_refs: [res.event_id] },
      { id: 'G10-07-A3', actual: { before: hb.value, after: ha.value }, read_refs: [hb.event_id, ha.event_id] },
    ],
    cleanup: { status: 'restored', description: 'rich安装SKILL.md已恢复原字节并回读哈希一致', read_refs: [ha.event_id] },
    business_call_refs: [call.call_id],
    notes: '原问题：正文包含回复标记不等于加载修改资源。本轮修改后调用rich：助手正文=FAST_RICH_NEW_OK；本轮轨迹记录引用技能并复述修改后的指令正文(含FAST_RICH_NEW_OK)；恢复前后SKILL.md哈希一致。',
  });
  saveBatchResult('G10-09', {
    environment_id: ENV, attempt_id: 'G10-09-A02', started_at: call.started_at, ended_at: call.ended_at,
    object_identity: 'fast-assert-rich-20261006-agent2 卡片标签', inputs: ['修改生效期间读取'],
    action_refs: [...A(ev, '外部合法修改SKILL.md')],
    actual_steps: ['外部合法修改rich并确认修改已生效', '在恢复之前读取rich卡片标签列表'],
    assertions: [{ id: 'G10-09-A1', actual: tag.value, read_refs: [tag.event_id] }],
    cleanup: { status: 'restored', description: '随后恢复SKILL.md原字节(同G10-07)', read_refs: [] },
    business_call_refs: [call.call_id],
    notes: '原问题：检查来源标签时已把外部修改恢复。本轮在修改生效期间读取rich卡片文本/标签列表，未出现“本地修改/已修改”标签(false)。',
  });
}

console.log('G10 results written');
