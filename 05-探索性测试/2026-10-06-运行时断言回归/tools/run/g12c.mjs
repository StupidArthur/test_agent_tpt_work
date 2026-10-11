import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { withApp, sleep, root, environmentId, evidenceFor, finalizeCase, openSettings, closeSettings, openSettingsSection, newTask, typeAndSend, waitTerminal, lastAssistantText, SEL } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G12c';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, locatorOrFn, fnOr) => { const locator = typeof locatorOrFn === 'function' ? scope : locatorOrFn; const fn = typeof locatorOrFn === 'function' ? locatorOrFn : fnOr; return log.read(target, object_id, { channel: 'dom', scope, locator }, fn); };
const FR = (target, object_id, scope, locator, fn) => log.read(target, object_id, { channel: 'file', scope, locator }, fn);
const BASE = 'http://127.0.0.1:9015/fast-assert-20261006-oc1';
const LOG = path.join(root, '运行日志', 'link-requests.jsonl');
const norm = s => (s || '').replace(/\s+/g, '');

await withApp(async (page) => {
  const scope = '设置/快捷键/链接';
  const dlgText = () => page.locator('[role="dialog"]:visible').first().innerText().catch(() => '');
  const openShortcuts = async () => { await openSettings(page); await openSettingsSection(page, '常规'); await page.getByRole('button', { name: '编辑快捷键' }).first().click({ timeout: 6000 }).catch(() => {}); await sleep(1200); };
  const readShortcut = (label, next) => page.evaluate(([label, next]) => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth && /快捷键/.test(e.innerText)); if (!d) return null; const t = d.innerText.replace(/\n/g, ' ').replace(/\s+/g, ' '); const re = new RegExp(label.replace(/[/／]/g, '\\$&') + '\\s+(.*?)\\s+' + next.replace(/[/／]/g, '\\$&')); const m = t.match(re); return m ? m[1].trim() : null; }, [label, next]);
  const modify = async (label, combo) => { const b = page.locator(`button[aria-label="修改${label}快捷键"]`).first(); await b.click({ timeout: 5000 }).catch(() => {}); await sleep(500); await page.keyboard.press(combo); await sleep(800); };
  const closeShortcuts = async () => { const b = page.locator('button[aria-label="关闭快捷键"]').first(); if (await b.count()) await b.click({ timeout: 4000 }).catch(() => {}); await sleep(500); };

  await closeSettings(page);

  // G12-08 shortcut
  await openShortcuts();
  const initShortcut = await readShortcut('新会话', '展开');
  await A('修改新会话快捷键', 'click+key', 'Ctrl+Alt+Shift+F9', () => modify('新会话', 'Control+Alt+Shift+F9'));
  const changedShortcut = await readShortcut('新会话', '展开');
  await closeShortcuts(); await closeSettings(page);
  await openShortcuts();
  const reopened = await readShortcut('新会话', '展开');
  await A('恢复新会话快捷键', 'click+key', 'Ctrl+N', () => modify('新会话', 'Control+N'));
  const restored = await readShortcut('新会话', '展开');
  await closeShortcuts(); await closeSettings(page);

  const r8a = await R('重开后的新建快捷键', 'shortcut.saved', scope, 'shortcut dialog', async () => ({ value: norm(reopened), raw: { reopened, initShortcut, changedShortcut } }));
  const r8b = await R('恢复后新建快捷键', 'shortcut.restored', scope, 'shortcut dialog', async () => ({ value: norm(restored), raw: { restored } }));

  // G12-09 search shortcut
  await openShortcuts();
  const searchCombo = await readShortcut('搜索会话', '添加');
  await closeShortcuts(); await closeSettings(page);
  await A('按搜索快捷键', 'key', 'Control+K', async () => { await page.locator('body').click({ timeout: 4000 }).catch(() => {}); await page.keyboard.press('Control+K'); await sleep(1200); });
  const r9 = await R('快捷键后的搜索会话输入', 'search.panel', '主窗口/搜索面板', 'search input', async () => { const v = await page.evaluate(() => { const i = [...document.querySelectorAll('input')].find(e => e.offsetWidth && /搜索会话|搜索/.test(e.getAttribute('placeholder') || e.getAttribute('aria-label') || '')); return !!i; }); return { value: v, raw: { searchCombo, visible: v }, derivation: 'search session input visible' }; });
  await page.keyboard.press('Escape'); await sleep(500);

  // G12-12 sidebar link
  await openSettings(page); await openSettingsSection(page, '常规');
  await A('确保链接设置为应用内侧边栏', 'click', '应用内侧边栏', async () => { const b = page.locator('button[class*="_2XZxNq_selector"]').nth(2); await b.click({ timeout: 5000 }).catch(() => {}); await sleep(600); await page.getByText('应用内侧边栏', { exact: true }).last().click({ timeout: 5000 }).catch(() => {}); await sleep(1000); });
  await closeSettings(page);
  await newTask(page);
  await typeAndSend(page, `请只输出一个 Markdown 链接，指向 ${BASE}/sidebar ，不要有其他内容。`);
  const term12 = await waitTerminal(page, { timeout: 120000 });
  const anchor = await page.evaluate(() => { const a = [...document.querySelectorAll('a')].find(x => /9015/.test(x.href || '')); return a ? a.href : null; });
  await A('点击侧栏链接锚点', 'click', anchor || 'none', async () => { const a = page.locator('a').filter({ hasText: /.+/ }).first(); const href = await page.evaluate(() => { const a = [...document.querySelectorAll('a')].find(x => /9015/.test(x.href || '')); if (a) a.click(); }); await sleep(2500); });
  const r12a = await R('本轮侧栏浏览器', 'link.sidebar.panel', '主窗口/侧栏浏览器', 'in-app panel', async () => { const v = await page.evaluate(() => { const p = [...document.querySelectorAll('*')].filter(e => e.offsetWidth > 200 && /127\.0\.0\.1:9015|sidebar/i.test(e.innerText || '') && /iframe|webview|浏览器|侧栏/.test((e.className || '').toString())); return p.length > 0; }); return { value: v, raw: { anchor, visible: v }, derivation: 'in-app sidebar browser panel visible' }; });
  const r12b = await FR('本轮URL请求日志', LOG, 'link fixture log', LOG, () => { const lines = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []; return { value: lines.map(l => l.path || l.url || JSON.stringify(l)), raw: { count: lines.length, sample: lines.slice(-3) } }; });

  // G12-13 default browser
  await openSettings(page); await openSettingsSection(page, '常规');
  await A('切链接为默认浏览器', 'click', '默认浏览器', async () => { const b = page.locator('button[class*="_2XZxNq_selector"]').nth(2); await b.click({ timeout: 5000 }).catch(() => {}); await sleep(600); await page.getByText('默认浏览器', { exact: true }).last().click({ timeout: 5000 }).catch(() => {}); await sleep(1000); });
  await closeSettings(page);
  await newTask(page);
  await typeAndSend(page, `请只输出一个 Markdown 链接，指向 ${BASE}/external ，不要有其他内容。`);
  const term13 = await waitTerminal(page, { timeout: 120000 });
  await A('点击默认浏览器链接锚点', 'click', 'external', async () => { await page.evaluate(() => { const a = [...document.querySelectorAll('a')].find(x => /9015/.test(x.href || '')); if (a) a.click(); }); await sleep(3000); });
  const r13a = await FR('默认浏览器User-Agent', LOG, 'link fixture log', LOG, () => { const lines = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []; const ext = lines.filter(l => /external/.test(l.path || l.url || '')); const ua = ext.length ? (ext[ext.length - 1].userAgent || ext[ext.length - 1].ua || '') : ''; return { value: /Chrome/i.test(ua) && !/Electron/i.test(ua), raw: { ua, count: ext.length } }; });
  await openSettings(page); await openSettingsSection(page, '常规');
  await A('恢复链接设置', 'click', '应用内侧边栏', async () => { const b = page.locator('button[class*="_2XZxNq_selector"]').nth(2); await b.click({ timeout: 5000 }).catch(() => {}); await sleep(600); await page.getByText('应用内侧边栏', { exact: true }).last().click({ timeout: 5000 }).catch(() => {}); await sleep(1000); });
  const r13b = await R('恢复后网页链接设置', 'link.restored', scope, 'selector', async () => { const v = await page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const b = d && [...d.querySelectorAll('button[class*="_2XZxNq_selector"]')]; return b && b[2] ? b[2].innerText.trim() : null; }); return { value: v ?? '', raw: { value: v } }; });
  await closeSettings(page);

  const ended = new Date().toISOString();
  if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, '', 'utf8');
  const ev = evidenceFor(g, ['运行日志/link-requests.jsonl']);
  const mk = (id, object_identity, inputs, steps, assertions) => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, attempt_id: 'G12-A03', environment_id: environmentId, evidence: ev, started_at: t0, ended_at: ended, action_refs: actionRefs, cleanup: { status: 'restored', description: '快捷键/链接设置恢复；夹具服务待收尾', read_refs: [] }, notes: 'G12快捷键/链接。' });
  mk('G12-08', '设置快捷键', ['Ctrl+Alt+Shift+F9'], ['改并重开恢复'], [{ id: 'G12-08-A1', actual: r8a.value, read_refs: [r8a.event_id] }, { id: 'G12-08-A2', actual: r8b.value, read_refs: [r8b.event_id] }]);
  mk('G12-09', '搜索快捷键', [], ['按快捷键读搜索面板'], [{ id: 'G12-09-A1', actual: r9.value, read_refs: [r9.event_id] }]);
  mk('G12-12', '侧栏链接', ['sidebar URL'], ['点击锚点读面板与日志'], [{ id: 'G12-12-A1', actual: r12a.value, read_refs: [r12a.event_id] }, { id: 'G12-12-A2', actual: r12b.value, read_refs: [r12b.event_id] }]);
  mk('G12-13', '默认浏览器链接', ['external URL'], ['点击锚点读UA并恢复'], [{ id: 'G12-13-A1', actual: r13a.value, read_refs: [r13a.event_id] }, { id: 'G12-13-A2', actual: r13b.value, read_refs: [r13b.event_id] }]);
  console.log(JSON.stringify({ r8: [norm(reopened), norm(restored), initShortcut], r9: [r9.value, searchCombo], r12: [r12a.value, r12b.raw], r13: [r13a.value, r13b.value] }, null, 2));
});
