import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { withApp, sleep, root, environmentId, evidenceFor, finalizeCase, openSettings, closeSettings, openSettingsSection } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G12';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, locatorOrFn, fnOr) => { const locator = typeof locatorOrFn === 'function' ? scope : locatorOrFn; const fn = typeof locatorOrFn === 'function' ? locatorOrFn : fnOr; return log.read(target, object_id, { channel: 'dom', scope, locator }, fn); };

await withApp(async (page) => {
  const scope = '设置对话框';
  const dlgText = () => page.locator('[role="dialog"]:visible').first().innerText().catch(() => '');
  const readSwitch = (label) => page.evaluate((label) => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); if (!d) return null; const sw = [...d.querySelectorAll('[role="switch"]')]; for (const s of sw) if (s.getAttribute('aria-label') === label) return s.getAttribute('aria-checked'); for (const s of sw) { let e = s; for (let i = 0; i < 6 && e; i++) { if ((e.innerText || '').includes(label)) return s.getAttribute('aria-checked'); e = e.parentElement; } } return null; }, label);
  const toggleSwitch = async (label) => { await page.evaluate((label) => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const sw = [...d.querySelectorAll('[role="switch"]')]; let target = sw.find(s => s.getAttribute('aria-label') === label); if (!target) for (const s of sw) { let e = s; for (let i = 0; i < 6 && e; i++) { if ((e.innerText || '').includes(label)) { target = s; break; } e = e.parentElement; } if (target) break; } if (target) target.click(); }, label); await sleep(1200); };
  const selectorVal = (cls, idx = 0) => page.evaluate(([cls, idx]) => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const b = d && [...d.querySelectorAll('button[class*="' + cls + '"]')]; return b && b[idx] ? b[idx].innerText.trim() : null; }, [cls, idx]);
  const pickOption = async (cls, idx, option) => { await page.evaluate(([cls, idx]) => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const b = d && [...d.querySelectorAll('button[class*="' + cls + '"]')]; if (b && b[idx]) b[idx].click(); }, [cls, idx]); await sleep(600); await page.getByText(option, { exact: true }).last().click({ timeout: 5000 }).catch(() => {}); await sleep(1000); };
  const snapshot = () => page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const q = c => { const b = d && d.querySelector('button[class*="' + c + '"]'); return b ? b.innerText.trim() : null; }; const sws = {}; if (d) [...d.querySelectorAll('[role="switch"]')].forEach(s => { sws[s.getAttribute('aria-label') || ''] = s.getAttribute('aria-checked'); }); return { theme: (() => { const s = d && [...d.querySelectorAll('button[class*="themeCube"]')].find(x => x.getAttribute('aria-pressed') === 'true'); return s ? s.innerText.trim() : null; })(), language: q('hVGvvW_selector'), font: (d ? (d.innerText.match(/字号大小[\s\S]*?\n(\d{1,2})\s*\n?px/) || [])[1] : null), permission: q('oY77xG_selector'), workSteps: (d ? [...d.querySelectorAll('button[class*="_2XZxNq_selector"]')].map(b => b.innerText.trim()) : [])[0], usage: (d ? [...d.querySelectorAll('button[class*="_2XZxNq_selector"]')].map(b => b.innerText.trim()) : [])[1], link: (d ? [...d.querySelectorAll('button[class*="_2XZxNq_selector"]')].map(b => b.innerText.trim()) : [])[2], switches: sws }; });

  await closeSettings(page);
  await openSettings(page);
  const snapBefore = await R('本轮可逆设置规范化快照', 'settings.snapshot', scope, 'snapshot', async () => ({ value: await snapshot(), raw: {} }));

  // G12-01 work steps
  await openSettingsSection(page, '常规');
  await A('切换工作步骤为详细', 'click', '详细', () => pickOption('_2XZxNq_selector', 0, '详细'));
  await A('重开设置', 'click', '关闭+设置', async () => { await closeSettings(page); await openSettings(page); });
  const r1a = await R('重开后的工作步骤设置', 'worksteps.saved', scope, 'selector', async () => ({ value: await selectorVal('_2XZxNq_selector', 0), raw: {} }));
  await A('恢复工作步骤', 'click', '标准', () => pickOption('_2XZxNq_selector', 0, '标准'));
  const r1b = await R('恢复后的工作步骤设置', 'worksteps.restored', scope, 'selector', async () => ({ value: await selectorVal('_2XZxNq_selector', 0), raw: {} }));

  // G12-04 memory
  await openSettingsSection(page, '记忆与进化');
  await A('切换启用记忆', 'click', '启用记忆', () => toggleSwitch('启用记忆'));
  await A('重开设置(记忆)', 'click', '关闭+设置', async () => { await closeSettings(page); await openSettings(page); await openSettingsSection(page, '记忆与进化'); });
  const r4a = await R('重开后的启用记忆', 'memory.saved', scope, 'switch', async () => { const c = await readSwitch('启用记忆'); return { value: c === 'true', raw: { checked: c }, derivation: "aria-checked === 'true'" }; });
  const r4b = await R('记忆开关保存错误', 'memory.error', scope, 'dialog', async () => { const t = await dlgText(); return { value: /保存失败|错误|失败/.test(t), raw: { has: /保存失败|错误|失败/.test(t) }, derivation: 'save error text present' }; });
  await A('恢复启用记忆', 'click', '启用记忆', () => toggleSwitch('启用记忆'));
  const r4c = await R('恢复后的启用记忆', 'memory.restored', scope, 'switch', async () => { const c = await readSwitch('启用记忆'); return { value: c === 'true', raw: { checked: c }, derivation: "aria-checked === 'true'" }; });

  // G12-05 evolution
  await openSettingsSection(page, '记忆与进化');
  await A('切换启用沉淀', 'click', '启用沉淀', () => toggleSwitch('启用沉淀'));
  await A('重开设置(沉淀)', 'click', '关闭+设置', async () => { await closeSettings(page); await openSettings(page); await openSettingsSection(page, '记忆与进化'); });
  const r5a = await R('重开后的启用沉淀', 'evolution.saved', scope, 'switch', async () => { const c = await readSwitch('启用沉淀'); return { value: c === 'true', raw: { checked: c }, derivation: "aria-checked === 'true'" }; });
  const r5b = await R('沉淀开关保存错误', 'evolution.error', scope, 'dialog', async () => { const t = await dlgText(); return { value: /保存失败|错误|失败/.test(t), raw: { has: /保存失败|错误|失败/.test(t) }, derivation: 'save error text present' }; });
  await A('恢复启用沉淀', 'click', '启用沉淀', () => toggleSwitch('启用沉淀'));
  const r5c = await R('恢复后的启用沉淀', 'evolution.restored', scope, 'switch', async () => { const c = await readSwitch('启用沉淀'); return { value: c === 'true', raw: { checked: c }, derivation: "aria-checked === 'true'" }; });

  // G12-06 experimental
  await openSettingsSection(page, '实验性功能');
  await A('切换实验总开关', 'click', '实验性功能', () => toggleSwitch('实验性功能'));
  await A('重开设置(实验)', 'click', '关闭+设置', async () => { await closeSettings(page); await openSettings(page); await openSettingsSection(page, '实验性功能'); });
  const r6a = await R('重开后的实验总开关', 'experimental.saved', scope, 'switch', async () => { const c = await readSwitch('实验性功能'); return { value: c === 'true', raw: { checked: c }, derivation: "aria-checked === 'true'" }; });
  await A('恢复实验总开关', 'click', '实验性功能', () => toggleSwitch('实验性功能'));
  const r6b = await R('恢复后的实验总开关', 'experimental.restored', scope, 'switch', async () => { const c = await readSwitch('实验性功能'); return { value: c === 'true', raw: { checked: c }, derivation: "aria-checked === 'true'" }; });

  // G12-07 developer
  await openSettingsSection(page, '开发者模式');
  await A('切换开发者模式', 'click', '开发者模式', () => toggleSwitch('开发者模式'));
  await A('重开设置(开发者)', 'click', '关闭+设置', async () => { await closeSettings(page); await openSettings(page); await openSettingsSection(page, '开发者模式'); });
  const r7a = await R('重开后的开发者模式', 'developer.saved', scope, 'switch', async () => { const c = await readSwitch('开发者模式'); return { value: c === 'true', raw: { checked: c }, derivation: "aria-checked === 'true'" }; });
  await A('恢复开发者模式', 'click', '开发者模式', () => toggleSwitch('开发者模式'));
  const r7b = await R('恢复后的开发者模式', 'developer.restored', scope, 'switch', async () => { const c = await readSwitch('开发者模式'); return { value: c === 'true', raw: { checked: c }, derivation: "aria-checked === 'true'" }; });

  // G12-16 profile
  await openSettingsSection(page, '个人主页');
  const r16 = await R('个人身份字段只读', 'profile.readonly', scope, 'profile inputs', async () => { const raw = await page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); return [...d.querySelectorAll('input')].map(e => ({ value: e.value, disabled: e.disabled, readOnly: e.readOnly })); }); const all = raw.length > 0 && raw.every(i => i.disabled || i.readOnly); return { value: all, raw: { inputs: raw }, derivation: 'all profile inputs disabled or readonly' }; });

  // G12-17 snapshot after
  await openSettingsSection(page, '常规');
  const snapAfter = await R('本轮可逆设置规范化快照', 'settings.snapshot', scope, 'snapshot', async () => ({ value: await snapshot(), raw: {} }));
  await closeSettings(page);

  const ended = new Date().toISOString();
  const ev = evidenceFor(g);
  const mk = (id, object_identity, inputs, steps, assertions) => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, attempt_id: 'G12-A01', environment_id: environmentId, evidence: ev, started_at: t0, ended_at: ended, action_refs: actionRefs, cleanup: { status: 'restored', description: '本轮设置项已恢复初值并回读', read_refs: [] }, notes: 'G12设置保存/恢复。' });
  mk('G12-01', '设置工作步骤', ['详细'], ['改并重开恢复'], [{ id: 'G12-01-A1', actual: r1a.value, read_refs: [r1a.event_id] }, { id: 'G12-01-A2', actual: r1b.value, read_refs: [r1b.event_id] }]);
  mk('G12-04', '设置启用记忆', ['反值'], ['切换并重开恢复'], [{ id: 'G12-04-A1', actual: r4a.value, read_refs: [r4a.event_id] }, { id: 'G12-04-A2', actual: r4b.value, read_refs: [r4b.event_id] }, { id: 'G12-04-A3', actual: r4c.value, read_refs: [r4c.event_id] }]);
  mk('G12-05', '设置启用沉淀', ['反值'], ['切换并重开恢复'], [{ id: 'G12-05-A1', actual: r5a.value, read_refs: [r5a.event_id] }, { id: 'G12-05-A2', actual: r5b.value, read_refs: [r5b.event_id] }, { id: 'G12-05-A3', actual: r5c.value, read_refs: [r5c.event_id] }]);
  mk('G12-06', '设置实验总开关', ['反值'], ['切换并重开恢复'], [{ id: 'G12-06-A1', actual: r6a.value, read_refs: [r6a.event_id] }, { id: 'G12-06-A2', actual: r6b.value, read_refs: [r6b.event_id] }]);
  mk('G12-07', '设置开发者模式', ['反值'], ['切换并重开恢复'], [{ id: 'G12-07-A1', actual: r7a.value, read_refs: [r7a.event_id] }, { id: 'G12-07-A2', actual: r7b.value, read_refs: [r7b.event_id] }]);
  mk('G12-16', '设置个人主页', [], ['读取只读身份'], [{ id: 'G12-16-A1', actual: r16.value, read_refs: [r16.event_id] }]);
  mk('G12-17', '设置快照', [], ['开始与恢复后读取同一字段集合'], [{ id: 'G12-17-A1', actual: { before: snapBefore.value, after: snapAfter.value }, read_refs: [snapBefore.event_id, snapAfter.event_id] }]);
  console.log(JSON.stringify({ r1: [r1a.value, r1b.value], r4: [r4a.value, r4b.value, r4c.value], r5: [r5a.value, r5b.value, r5c.value], r6: [r6a.value, r6b.value], r7: [r7a.value, r7b.value], r16: r16.value, snapSame: JSON.stringify(snapBefore.value) === JSON.stringify(snapAfter.value), snapBefore: snapBefore.value, snapAfter: snapAfter.value }, null, 2));
});
