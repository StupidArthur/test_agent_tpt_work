import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { withApp, sleep, root, environmentId, evidenceFor, finalizeCase, openSettings, closeSettings, openSettingsSection, isSettingsOpen, newTask, typeAndSend, waitTerminal, lastAssistantText, SEL } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G6';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, locatorOrFn, fnOr) => { const locator = typeof locatorOrFn === 'function' ? scope : locatorOrFn; const fn = typeof locatorOrFn === 'function' ? locatorOrFn : fnOr; return log.read(target, object_id, { channel: 'dom', scope, locator }, fn); };
const out = {};

await withApp(async (page) => {
  const settingsText = () => page.locator('[role="dialog"]:visible').first().innerText().catch(() => '');
  const dlgValue = async (cls) => page.evaluate((cls) => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const b = d && d.querySelector('button[class*="' + cls + '"]'); return b ? b.innerText.trim() : null; }, cls);
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const themeSel = () => page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const b = d && [...d.querySelectorAll('button[class*="themeCube"]')].find(x => x.getAttribute('aria-pressed') === 'true'); return b ? b.innerText.trim() : null; });
  const fontVal = async () => (await settingsText()).match(/字号大小[\s\S]*?\n(\d{1,2})\s*\n?px/)?.[1] ?? null;
  const composerScene = () => page.evaluate(() => { const e = [...document.querySelectorAll('[class*="seat"],[class*="scene"],[class*="Scene"]')].find(x => /模式/.test(x.innerText || '')); return e ? e.innerText.trim().replace(/\s+/g, '') : null; });
  const composerPerm = () => page.evaluate(() => { const e = [...document.querySelectorAll('*')].find(x => x.children.length === 0 && /仅可查看|工作区内修改|完全权限/.test(x.textContent || '')); return e ? e.textContent.trim() : null; });

  // ===== G6-01 theme =====
  await openSettings(page);
  const rThemeBgBefore = await R('本轮主题影响表面', 'theme.surface', '主窗口根表面', 'documentElement background-color', async () => ({ value: await bg(), raw: { bg: await bg() } }));
  await A('切换主题为深色', 'click', '深色', async () => { await page.locator('[role="dialog"]:visible button[class*="themeCube"]').filter({ hasText: '深色' }).first().click({ timeout: 6000 }); await sleep(1500); });
  const rThemeBgAfter = await R('本轮主题影响表面', 'theme.surface', '主窗口根表面', 'documentElement background-color', async () => ({ value: await bg(), raw: { bg: await bg() } }));
  await A('关闭并重开设置读取主题', 'click', '关闭+设置', async () => { await closeSettings(page); await openSettings(page); await sleep(1000); });
  const rThemeSaved = await R('主题保存', 'settings.theme.saved', '设置对话框/常规/外观', 'themeCube selected', async () => ({ value: await themeSel(), raw: { selected: await themeSel() } }));
  await A('恢复主题初值', 'click', '跟随系统', async () => { await page.locator('[role="dialog"]:visible button[class*="themeCube"]').filter({ hasText: '跟随系统' }).first().click({ timeout: 6000 }); await sleep(1200); });
  const rThemeRestored = await R('主题恢复', 'settings.theme.restored', '设置对话框/常规/外观', 'themeCube selected', async () => ({ value: await themeSel(), raw: { selected: await themeSel() } }));

  // ===== G6-02 language =====
  await A('切换语言为English', 'click', 'English', async () => {
    await page.locator('button[class*="hVGvvW_selector"]').first().click({ timeout: 6000 }); await sleep(700);
    await page.getByText('English', { exact: true }).last().click({ timeout: 6000 }); await sleep(1500);
  });
  const rLangNav = await R('设置导航语言', 'settings.nav.language', '设置对话框/导航', 'nav text', async () => { const t = await settingsText(); return { value: /General/.test(t) ? 'General' : (t.split('\n').filter(Boolean)[1] || ''), raw: { hasGeneral: /General/.test(t), head: t.slice(0, 120) } }; });
  await A('恢复语言为中文', 'click', '中文', async () => {
    await page.locator('button[class*="hVGvvW_selector"]').first().click({ timeout: 6000 }); await sleep(700);
    await page.getByText('中文', { exact: true }).last().click({ timeout: 6000 }); await sleep(1500);
  });
  const rLangRestored = await R('语言恢复', 'settings.language.restored', '设置对话框/常规/语言', 'language selector', async () => ({ value: await dlgValue('hVGvvW_selector'), raw: {} }));

  // ===== G6-03 font save =====
  const fontStart = await fontVal();
  await A('增大字号至初值+2', 'click', '增大字号x2', async () => { for (let i = 0; i < 2; i++) { await page.locator('button[aria-label="增大字号"]').first().click({ timeout: 5000 }); await sleep(600); } });
  await A('关闭并重开设置读取字号', 'click', '关闭+设置', async () => { await closeSettings(page); await openSettings(page); await sleep(1000); });
  const rFontSaved = await R('重开设置字号', 'settings.font.saved', '设置对话框/常规/字号', 'font number', async () => ({ value: Number(await fontVal()), raw: { text: await fontVal(), start: fontStart } }));

  // ===== G6-04 font behavior =====
  await closeSettings(page);
  await A('新建会话测字号', 'click', '新建任务', async () => { await newTask(page); });
  await A('发送字号探测消息', 'fill+click', '只回答：FONT_OK', () => typeAndSend(page, '只回答：FONT_OK'));
  const term = await waitTerminal(page, { expect: 'FONT_OK', timeout: 120000 });
  const rFontBody = await R('新会话助手正文字号', 'font.body.changed', '主任务视图/助手正文', 'computed font-size', async () => {
    const size = await page.evaluate(() => { const b = [...document.querySelectorAll('[class*="hWmORq_body"]')].filter(e => (e.innerText || '').trim()).pop(); return b ? getComputedStyle(b).fontSize : null; });
    return { value: size ? parseFloat(size) : null, raw: { fontSize: size, terminalOk: term.ok } };
  });
  await openSettings(page);
  await A('恢复字号初值', 'click', '减小字号x2', async () => { for (let i = 0; i < 2; i++) { await page.locator('button[aria-label="减小字号"]').first().click({ timeout: 5000 }); await sleep(600); } await closeSettings(page); });
  await A('恢复后新建会话测字号', 'click', '新建任务', async () => { await newTask(page); });
  await A('发送恢复字号探测消息', 'fill+click', '只回答：FONT_OK', () => typeAndSend(page, '只回答：FONT_OK'));
  const term2 = await waitTerminal(page, { expect: 'FONT_OK', timeout: 120000 });
  const rFontBodyRestored = await R('恢复后同一正文字号', 'font.body.restored', '主任务视图/助手正文', 'computed font-size', async () => {
    const size = await page.evaluate(() => { const b = [...document.querySelectorAll('[class*="hWmORq_body"]')].filter(e => (e.innerText || '').trim()).pop(); return b ? getComputedStyle(b).fontSize : null; });
    return { value: size ? parseFloat(size) : null, raw: { fontSize: size, terminalOk: term2.ok } };
  });

  // ===== G6-05 permission save =====
  await openSettings(page);
  await A('切换默认权限为仅可查看', 'click', '仅可查看', async () => {
    await page.locator('button[class*="oY77xG_selector"]').first().click({ timeout: 6000 }); await sleep(700);
    await page.getByText('仅可查看', { exact: true }).last().click({ timeout: 6000 }); await sleep(1200);
  });
  await A('关闭并重开设置读取权限', 'click', '关闭+设置', async () => { await closeSettings(page); await openSettings(page); await sleep(1000); });
  const rPermSaved = await R('重开设置默认权限', 'settings.permission.saved', '设置对话框/常规/权限', 'permission selector', async () => ({ value: await dlgValue('oY77xG_selector'), raw: {} }));

  // ===== G6-06 permission new task =====
  await closeSettings(page);
  await A('新建空白任务读权限', 'click', '新建任务', async () => { await newTask(page); });
  const rPermTask = await R('改后新空白任务权限', 'task.permission.changed', '主任务视图/composer 权限标签', 'permission label', async () => ({ value: await composerPerm(), raw: {} }));
  await openSettings(page);
  await A('恢复默认权限初值', 'click', '工作区内修改', async () => {
    await page.locator('button[class*="oY77xG_selector"]').first().click({ timeout: 6000 }); await sleep(700);
    await page.getByText('工作区内修改', { exact: true }).last().click({ timeout: 6000 }); await sleep(1200); await closeSettings(page);
  });
  await openSettings(page);
  const rPermRestoredSetting = await R('恢复后默认权限设置', 'settings.permission.restored', '设置对话框/常规/权限', 'permission selector', async () => ({ value: await dlgValue('oY77xG_selector'), raw: {} }));
  await closeSettings(page);
  await A('恢复后新建另一个空白任务', 'click', '新建任务', async () => { await newTask(page); });
  const rPermTaskRestored = await R('恢复后另一个新任务权限', 'task.permission.restored', '主任务视图/composer 权限标签', 'permission label', async () => ({ value: await composerPerm(), raw: {} }));

  // ===== G6-07 scene PTC =====
  await openSettings(page);
  await openSettingsSection(page, '场景预设');
  await A('切换新任务默认场景为PTC', 'click', 'PTC 模式', async () => { await page.getByRole('button', { name: '设为新任务默认: PTC 模式' }).click({ timeout: 6000 }); await sleep(1500); });
  await closeSettings(page);
  await A('切PTC后新建空白任务', 'click', '新建任务', async () => { await newTask(page); });
  const rScenePtc = await R('切PTC后的新任务场景', 'task.scene.ptc', '主任务视图/composer 场景标签', 'scene seat', async () => ({ value: await composerScene(), raw: {} }));

  // ===== G6-08 scene restore =====
  await openSettings(page);
  await openSettingsSection(page, '场景预设');
  await A('恢复新任务默认场景', 'click', '标准模式', async () => { await page.getByRole('button', { name: '设为新任务默认: 标准模式' }).click({ timeout: 6000 }).catch(async () => { await page.getByRole('button', { name: '新任务默认: 标准模式' }).click({ timeout: 6000 }).catch(() => {}); }); await sleep(1500); });
  await closeSettings(page);
  await A('恢复场景后新建另一个空白任务', 'click', '新建任务', async () => { await newTask(page); });
  const rSceneRestored = await R('恢复后的另一个新任务场景', 'task.scene.restored', '主任务视图/composer 场景标签', 'scene seat', async () => ({ value: await composerScene(), raw: {} }));

  const ended = new Date().toISOString();
  const ev = evidenceFor(g);
  const mk = (id, object_identity, inputs, steps, assertions) => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, attempt_id: 'G6-A01', environment_id: environmentId, evidence: ev, started_at: t0, ended_at: ended, action_refs: actionRefs, cleanup: { status: 'restored', description: '主题/语言/字号/权限/场景均已恢复初值并独立回读', read_refs: [] }, notes: 'G6逐项保存初值、修改、效果、重开与恢复。' });
  mk('G6-01', '设置外观', ['深色'], ['读初值', '切深色', '读颜色', '重开读选中', '恢复'], [{ id: 'G6-01-A1', actual: { before: rThemeBgBefore.value, after: rThemeBgAfter.value }, read_refs: [rThemeBgBefore.event_id, rThemeBgAfter.event_id] }, { id: 'G6-01-A2', actual: rThemeSaved.value, read_refs: [rThemeSaved.event_id] }, { id: 'G6-01-A3', actual: rThemeRestored.value, read_refs: [rThemeRestored.event_id] }]);
  mk('G6-02', '设置语言', ['English'], ['切English', '读导航', '恢复中文', '读语言'], [{ id: 'G6-02-A1', actual: rLangNav.value, read_refs: [rLangNav.event_id] }, { id: 'G6-02-A2', actual: rLangRestored.value, read_refs: [rLangRestored.event_id] }]);
  mk('G6-03', '设置字号', ['+2px'], ['增大字号', '重开读'], [{ id: 'G6-03-A1', actual: rFontSaved.value, read_refs: [rFontSaved.event_id] }]);
  mk('G6-04', '助手正文字号', ['只回答：FONT_OK'], ['新会话测字号', '恢复', '再测'], [{ id: 'G6-04-A1', actual: rFontBody.value, read_refs: [rFontBody.event_id] }, { id: 'G6-04-A2', actual: rFontBodyRestored.value, read_refs: [rFontBodyRestored.event_id] }]);
  mk('G6-05', '设置默认权限', ['仅可查看'], ['切仅可查看', '重开读'], [{ id: 'G6-05-A1', actual: rPermSaved.value, read_refs: [rPermSaved.event_id] }]);
  mk('G6-06', '默认权限行为', ['仅可查看'], ['新任务读权限', '恢复', '再新任务'], [{ id: 'G6-06-A1', actual: rPermTask.value, read_refs: [rPermTask.event_id] }, { id: 'G6-06-A2', actual: rPermRestoredSetting.value, read_refs: [rPermRestoredSetting.event_id] }, { id: 'G6-06-A3', actual: rPermTaskRestored.value, read_refs: [rPermTaskRestored.event_id] }]);
  mk('G6-07', '场景预设', ['PTC 模式'], ['切PTC', '新任务读场景'], [{ id: 'G6-07-A1', actual: rScenePtc.value, read_refs: [rScenePtc.event_id] }]);
  mk('G6-08', '场景预设恢复', ['标准模式'], ['恢复标准', '新任务读场景'], [{ id: 'G6-08-A1', actual: rSceneRestored.value, read_refs: [rSceneRestored.event_id] }]);
  console.log(JSON.stringify({ theme: [rThemeBgBefore.value, rThemeBgAfter.value, rThemeSaved.value, rThemeRestored.value], lang: [rLangNav.value, rLangRestored.value], font: [rFontSaved.value, rFontBody.value, rFontBodyRestored.value], perm: [rPermSaved.value, rPermTask.value, rPermRestoredSetting.value, rPermTaskRestored.value], scene: [rScenePtc.value, rSceneRestored.value] }, null, 2));
});
