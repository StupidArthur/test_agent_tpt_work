import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { withApp, sleep, root, environmentId, evidenceFor, finalizeCase, openSettings, closeSettings, openSettingsSection, newTask, typeAndSend, waitTerminal, SEL } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G12b';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, locatorOrFn, fnOr) => { const locator = typeof locatorOrFn === 'function' ? scope : locatorOrFn; const fn = typeof locatorOrFn === 'function' ? locatorOrFn : fnOr; return log.read(target, object_id, { channel: 'dom', scope, locator }, fn); };
const FR = (target, object_id, scope, locator, fn) => log.read(target, object_id, { channel: 'file', scope, locator }, fn);
const WORK = 'D:\\code\\tpt-workspace\\.fast-assert-20261006-oc1';

await withApp(async (page) => {
  const scope = '设置/任务视图';
  const dlgSel = (idx) => page.evaluate((idx) => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const b = d && [...d.querySelectorAll('button[class*="_2XZxNq_selector"]')]; return b && b[idx] ? b[idx].innerText.trim() : null; }, idx);
  const pick = async (idx, option) => { await page.evaluate((idx) => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const b = d && [...d.querySelectorAll('button[class*="_2XZxNq_selector"]')]; if (b && b[idx]) b[idx].click(); }, idx); await sleep(600); await page.getByText(option, { exact: true }).last().click({ timeout: 5000 }).catch(() => {}); await sleep(1000); };
  const footerText = () => page.evaluate(() => { const el = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /tok\/s|tok|轮|步/.test(e.textContent || '')); const f = el.map(e => e.textContent.trim()).filter(Boolean); return [...new Set(f)].join(' | '); });

  await closeSettings(page);
  // completed task for footer
  await newTask(page);
  await typeAndSend(page, '只回答：USAGE_OK');
  await waitTerminal(page, { expect: 'USAGE_OK', timeout: 120000 });
  const rDetail = await R('详细页脚字段', 'usage.detail', '主任务视图/页脚', 'footer', async () => { const t = await footerText(); const has = /轮/.test(t) && /步/.test(t) && /tok/i.test(t); return { value: has, raw: { footer: t }, derivation: '轮次/步骤/token all present' }; });

  await openSettings(page);
  await A('切用量为简洁', 'click', '简洁', () => pick(1, '简洁'));
  await closeSettings(page);
  const rSimple1 = await R('简洁页脚轮次步骤token总量', 'usage.simple', '主任务视图/页脚', 'footer', async () => { const t = await footerText(); const hidden = !/轮/.test(t) && !/步/.test(t) && !/tok/i.test(t); return { value: hidden, raw: { footer: t }, derivation: 'detailed fields hidden' }; });
  const rSimple2 = await R('简洁页脚基本用量', 'usage.simple.base', '主任务视图/页脚', 'footer', async () => { const t = await footerText(); const base = /tok\/s|%/i.test(t); return { value: base, raw: { footer: t }, derivation: 'tok/s or context % present' }; });

  await openSettings(page);
  await A('恢复用量为详细', 'click', '详细', () => pick(1, '详细'));
  await closeSettings(page);
  const rDetail2 = await R('详细页脚字段', 'usage.detail', '主任务视图/页脚', 'footer', async () => { const t = await footerText(); const has = /轮/.test(t) && /步/.test(t) && /tok/i.test(t); return { value: has, raw: { footer: t }, derivation: '轮次/步骤/token all present' }; });
  await openSettings(page);
  const rUsageRestored = await R('恢复后的用量设置', 'usage.restored', scope, 'selector', async () => ({ value: await dlgSel(1), raw: {} }));

  // G12-10 code tools on
  await closeSettings(page);
  await openSettings(page);
  const rCodeInit = await R('代码工具初值', 'codetools.initial', scope, 'switch', async () => { const c = await page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const s = d && d.querySelector('[role="switch"]'); return s ? s.getAttribute('aria-checked') : null; }); return { value: c === 'true', raw: { checked: c }, derivation: "aria-checked === 'true'" }; });
  const setCode = async (on) => { await page.evaluate((on) => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const s = d && d.querySelector('[role="switch"]'); if (s && (s.getAttribute('aria-checked') === 'true') !== on) s.click(); }, on); await sleep(1200); };
  await A('开启代码工具', 'click', 'switch', () => setCode(true));
  await closeSettings(page);
  const fileOn = path.join(WORK, 'code-on.js'); fs.writeFileSync(fileOn, 'module.exports = 0;\n', 'utf8');
  await newTask(page);
  await page.locator('[aria-label^="访问模式"]').first().click({ timeout: 5000 }).catch(() => {}); await sleep(500); await page.getByText('工作区内修改', { exact: true }).last().click({ timeout: 5000 }).catch(() => {}); await sleep(700);
  await typeAndSend(page, `只把此绝对路径文件 ${fileOn} 的完整内容改为 module.exports = 1;（可带末尾换行），随后读取确认；不改其他文件。`);
  const term10 = await waitTerminal(page, { timeout: 120000 });
  const r10a = await FR('开启态code-on.js实际内容', fileOn, '本轮工作目录', fileOn, () => ({ value: fs.existsSync(fileOn) ? fs.readFileSync(fileOn, 'utf8').trim() : '', raw: { exists: fs.existsSync(fileOn) } }));
  const r10b = await R('开启态Trace入口', 'codetools.trace', '主任务视图', 'trace tab', async () => { const v = await page.getByRole('tab', { name: '轨迹', exact: true }).first().isVisible().catch(() => false); return { value: v, raw: { visible: v }, derivation: 'trace tab visible' }; });

  // G12-11 code tools off
  await openSettings(page);
  await A('关闭代码工具', 'click', 'switch', () => setCode(false));
  await closeSettings(page);
  const fileOff = path.join(WORK, 'code-off.js'); fs.writeFileSync(fileOff, 'module.exports = 0;\n', 'utf8');
  await newTask(page);
  await page.locator('[aria-label^="访问模式"]').first().click({ timeout: 5000 }).catch(() => {}); await sleep(500); await page.getByText('工作区内修改', { exact: true }).last().click({ timeout: 5000 }).catch(() => {}); await sleep(700);
  await typeAndSend(page, `只把此绝对路径文件 ${fileOff} 的完整内容改为 module.exports = 1;（可带末尾换行），随后读取确认；不改其他文件。`);
  const term11 = await waitTerminal(page, { timeout: 120000 });
  const r11a = await R('关闭态Trace入口', 'codetools.trace.off', '主任务视图', 'trace tab', async () => { const v = await page.getByRole('tab', { name: '轨迹', exact: true }).first().isVisible().catch(() => false); return { value: v, raw: { visible: v }, derivation: 'trace tab visible' }; });
  const r11b = await FR('关闭态code-off.js实际内容', fileOff, '本轮工作目录', fileOff, () => ({ value: fs.existsSync(fileOff) ? fs.readFileSync(fileOff, 'utf8').trim() : '', raw: { exists: fs.existsSync(fileOff) } }));
  await openSettings(page);
  await A('恢复代码工具初值', 'click', 'switch', async () => { await setCode(rCodeInit.value); await closeSettings(page); });
  await openSettings(page);
  const r11c = await R('恢复后代码工具设置', 'codetools.restored', scope, 'switch', async () => { const c = await page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const s = d && d.querySelector('[role="switch"]'); return s ? s.getAttribute('aria-checked') : null; }); return { value: c === 'true', raw: { checked: c }, derivation: "aria-checked === 'true'" }; });
  await closeSettings(page);

  const ended = new Date().toISOString();
  const ev = evidenceFor(g);
  const mk = (id, object_identity, inputs, steps, assertions) => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, attempt_id: 'G12-A02', environment_id: environmentId, evidence: ev, started_at: t0, ended_at: ended, action_refs: actionRefs, cleanup: { status: 'restored', description: '用量与代码工具恢复初值', read_refs: [] }, notes: 'G12用量/代码工具。' });
  mk('G12-02', '设置用量', ['简洁'], ['切简洁读页脚'], [{ id: 'G12-02-A1', actual: rSimple1.value, read_refs: [rSimple1.event_id] }, { id: 'G12-02-A2', actual: rSimple2.value, read_refs: [rSimple2.event_id] }]);
  mk('G12-03', '设置用量', ['详细'], ['切详细读页脚并恢复'], [{ id: 'G12-03-A1', actual: rDetail2.value, read_refs: [rDetail2.event_id] }, { id: 'G12-03-A2', actual: rUsageRestored.value, read_refs: [rUsageRestored.event_id] }]);
  mk('G12-10', '代码工具开启', ['code-on.js'], ['开启并写文件'], [{ id: 'G12-10-A1', actual: r10a.value, read_refs: [r10a.event_id] }, { id: 'G12-10-A2', actual: r10b.value, read_refs: [r10b.event_id] }]);
  mk('G12-11', '代码工具关闭', ['code-off.js'], ['关闭并写文件并恢复'], [{ id: 'G12-11-A1', actual: r11a.value, read_refs: [r11a.event_id] }, { id: 'G12-11-A2', actual: r11b.value, read_refs: [r11b.event_id] }, { id: 'G12-11-A3', actual: r11c.value, read_refs: [r11c.event_id] }]);
  console.log(JSON.stringify({ usage: [rDetail.value, rSimple1.value, rSimple2.value, rDetail2.value, rUsageRestored.value], code: [rCodeInit.value, r10a.value, r10b.value, r11a.value, r11b.value, r11c.value], term: [term10.ok, term11.ok] }, null, 2));
});
