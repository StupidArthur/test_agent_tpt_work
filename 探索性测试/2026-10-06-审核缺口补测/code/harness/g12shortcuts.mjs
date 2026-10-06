import { saveResult, callEvents, lastCall } from './results.mjs';
import fs from 'node:fs';

const call = lastCall('settings.shortcuts');
const events = callEvents(call.call_id);
const R = (t) => events.filter((e) => e.target === t && e.kind === 'read');
const A = (t) => events.filter((e) => e.target === t && e.kind === 'action').map((e) => e.event_id);
const ENV = 'env-20261006-agent2';
const newInit = R('新建快捷键初值')[0];
const reopen = R('重开后的新建快捷键')[0];
const restored = R('恢复后新建快捷键')[0];
const panel = R('快捷键后的搜索会话输入')[0];

saveResult('G12-08', {
  environment_id: ENV, attempt_id: 'G12-08-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: '设置/快捷键/新会话组合', inputs: ['Ctrl+Alt+Shift+F9', '恢复初值'],
  action_refs: [...A('修改新会话快捷键'), ...A('恢复新会话快捷键')],
  actual_steps: ['读取真实快捷键编辑器新会话组合', '改为Ctrl+Alt+Shift+F9', '关闭重开回读', '恢复原组合并回读'],
  assertions: [
    { id: 'G12-08-A1', actual: reopen.value, read_refs: [reopen.event_id] },
    { id: 'G12-08-A2', actual: restored.value, read_refs: [restored.event_id] },
  ],
  cleanup: { status: 'restored', description: '新会话快捷键已恢复为初值Ctrl+N并回读', read_refs: [restored.event_id] },
  business_call_refs: [call.call_id],
  notes: '原问题：快捷键初值/改值/恢复值全为null。本轮在真实快捷键编辑器按行kbd读取并编辑：初值Ctrl+N→改Ctrl+Alt+Shift+F9→关闭重开仍为Ctrl+Alt+Shift+F9→恢复Ctrl+N。',
});

saveResult('G12-09', {
  environment_id: ENV, attempt_id: 'G12-09-A02', started_at: call.started_at, ended_at: call.ended_at,
  object_identity: '搜索会话快捷键组合与搜索面板', inputs: ['按当前搜索会话组合'],
  action_refs: A('按当前搜索快捷键'),
  actual_steps: ['在快捷键dialog读取当前搜索会话组合', '关闭弹层', '实际按下该组合', '读取搜索面板输入可见性'],
  assertions: [{ id: 'G12-09-A1', actual: panel.value, read_refs: [panel.event_id] }],
  cleanup: { status: 'unchanged', description: '关闭搜索面板，无设置/资产变更', read_refs: [] },
  business_call_refs: [call.call_id],
  notes: '原问题：未读出配置却固定按CtrlK。本轮在快捷键dialog读取当前搜索会话组合为Ctrl+K，关闭弹层后实际按下该组合，读取到可见搜索输入面板。',
});

const p = '运行上下文.json';
const ctx = JSON.parse(fs.readFileSync(p, 'utf8'));
ctx.binding_sources.shortcut_new_initial = { kind: 'read', event_id: newInit.event_id };
fs.writeFileSync(p, JSON.stringify(ctx, null, 2) + '\n', 'utf8');
console.log('g12 shortcuts results written; shortcut_new_initial ->', newInit.event_id);
