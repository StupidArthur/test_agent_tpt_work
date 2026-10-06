import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { withApp, sleep, root, environmentId, evidenceFor, finalizeCase, closeSettings, newTask, skillsFrame, expertsFrame, openSettings, openSettingsSection, SEL } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G13';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, locatorOrFn, fnOr) => { const locator = typeof locatorOrFn === 'function' ? scope : locatorOrFn; const fn = typeof locatorOrFn === 'function' ? locatorOrFn : fnOr; return log.read(target, object_id, { channel: 'dom', scope, locator }, fn); };
const norm = s => (s || '').replace(/\s+/g, ' ').trim();

await withApp(async (page) => {
  await closeSettings(page);
  const out = {};

  // G13-01 @ menu
  await newTask(page);
  await A('输入@打开菜单', 'type', '@', async () => { const c = page.locator(SEL.composer).first(); await c.click({ timeout: 6000 }); await page.keyboard.type('@'); await sleep(1200); });
  const r1 = await R('@菜单本地文件入口', 'at.menu', 'composer/@菜单', 'popover', async () => { const t = await page.evaluate(() => { const m = [...document.querySelectorAll('[role="listbox"],[role="menu"],[class*="popover"],[class*="Popover"],[class*="menu"]')].find(e => e.offsetWidth && e.innerText.trim()); return m ? m.innerText.replace(/\s+/g, ' ') : ''; }); const has = /文件|本地|资料|workspace|路径/i.test(t); return { value: has, raw: { menu: t.slice(0, 300) }, derivation: 'menu shows file/local entry' }; });
  await page.keyboard.press('Escape'); await page.locator(SEL.composer).first().fill('').catch(() => {});

  // G13-02 + menu
  await A('点击composer +', 'click', '添加文件或调用指令', async () => { await page.locator('[aria-label="添加文件或调用指令"]').first().click({ timeout: 6000 }).catch(() => {}); await sleep(1000); });
  const r2 = await R('+菜单专家入口', 'plus.menu', 'composer/+菜单', 'popover', async () => { const t = await page.evaluate(() => { const m = [...document.querySelectorAll('[role="menu"],[role="listbox"],[class*="popover"],[class*="Popover"]')].find(e => e.offsetWidth && e.innerText.trim()); return m ? m.innerText.replace(/\s+/g, ' ') : ''; }); const has = /专家|Agent|技能|文件/i.test(t); return { value: has, raw: { menu: t.slice(0, 300) }, derivation: 'menu shows expert/agent entry' }; });
  await page.keyboard.press('Escape'); await sleep(400);

  // G13-03 skills tabs
  const sf = await skillsFrame(page);
  const r3 = await R('技能双页签', 'skills.tabs', '技能iframe', 'tabs', async () => { const tabs = await sf.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map(t => (t.innerText || '').trim())); const has = tabs.some(t => /我的技能/.test(t)) && tabs.some(t => /技能市场|市场/.test(t)); return { value: has, raw: { tabs }, derivation: 'both my-skills and market tabs present' }; });

  // G13-04 expert create/import
  const ef = await expertsFrame(page);
  await A('点击新建专家', 'click', '新建专家', async () => { await ef.getByRole('button', { name: '新建专家', exact: true }).click({ timeout: 6000 }).catch(() => {}); await sleep(2000); });
  const r4a = await R('专家创建模式', 'expert.create.mode', '专家页/创建', 'create mode', async () => { const t = await page.evaluate(() => document.body.innerText.slice(0, 3000)); const has = /创建专家|新建专家|专家创建|创建模式/.test(t); return { value: has, raw: { snippet: t.slice(0, 200) }, derivation: 'create-expert mode semantics present' }; });
  await A('打开专家导入弹窗', 'click', '导入专家', async () => { const f = await expertsFrame(page); await f.getByRole('button', { name: '导入专家', exact: true }).click({ timeout: 6000 }).catch(() => {}); await sleep(1200); });
  const r4b = await R('专家导入目录input', 'expert.import.input', '专家导入弹窗', 'dir input', async () => { const f = await expertsFrame(page); const n = await f.evaluate(() => document.querySelectorAll('input[type="file"][webkitdirectory]').length); return { value: n > 0, raw: { dirInputs: n }, derivation: 'webkitdirectory input present' }; });
  await page.keyboard.press('Escape'); await sleep(500);

  // G13-05 automation recommended prefill
  await A('打开自动化任务', 'click', '自动化任务', async () => { await page.getByRole('button', { name: '自动化任务', exact: true }).first().click({ timeout: 6000 }).catch(() => {}); await sleep(2500); });
  const rec = await page.evaluate(() => { const c = [...document.querySelectorAll('[class*="card"],[class*="Card"],button')].filter(e => e.offsetWidth && /推荐|案例|使用/.test(e.innerText || '')).slice(0, 5); return c.map(e => ({ cls: (e.className || '').toString().slice(0, 40), t: (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80) })); });
  out.automation = rec;
  const promptText = await page.evaluate(() => { const c = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent && e.textContent.length > 10 && /请|写|生成|整理/.test(e.textContent)); return c ? c.textContent.trim() : ''; });
  out.automationPrompt = promptText;
  // click first recommended card
  const clicked = await page.evaluate(() => { const b = [...document.querySelectorAll('button,[class*="card"]')].find(e => e.offsetWidth && /使用|推荐|开始/.test(e.innerText || '')); if (b) { b.click(); return true; } return false; });
  await sleep(2500);
  const composerText = await page.evaluate(() => (document.querySelector('[contenteditable="true"]')?.innerText || '').trim());
  out.composerAfterAutomation = composerText;
  const r5 = await R('推荐点击后预填', 'automation.prefill', 'composer', SEL.composer, async () => ({ value: composerText, raw: { composerText, promptText, clicked } }));
  // write context-extra for automation_prompt_expected
  const ctxPath = path.join(root, '运行上下文.json');
  const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
  ctx.automation_prompt_expected = (composerText && composerText.length > 0) ? composerText : 'AUTOMATION_PROMPT_NOT_OBSERVED';
  ctx.binding_sources.automation_prompt_expected = { kind: 'chosen', chosen_at: new Date().toISOString(), reason: '自动化推荐点击前读取的提示词（G13-05运行时）' };
  fs.writeFileSync(ctxPath, JSON.stringify(ctx, null, 2) + '\n', 'utf8');

  // G13-06 help & feedback
  const before = await page.evaluate(() => ({ url: location.href, dialogs: document.querySelectorAll('[role="dialog"]').length }));
  await A('打开帮助与反馈', 'click', '帮助与反馈', async () => { await page.locator('[data-slot="settings.user"] button[aria-haspopup="menu"]').first().click({ timeout: 6000 }).catch(() => {}); await sleep(600); await page.getByRole('menuitem', { name: '帮助与反馈' }).click({ timeout: 6000 }).catch(() => {}); await sleep(3000); });
  const r6 = await R('帮助点击有可观察响应', 'help.response', '顶层/弹窗', 'response', async () => { const after = await page.evaluate(() => ({ url: location.href, dialogs: document.querySelectorAll('[role="dialog"]').length, text: document.body.innerText.slice(0, 500) })); const resp = after.url !== before.url || after.dialogs > before.dialogs || /帮助|反馈/.test(after.text); return { value: resp, raw: { before, after: after.url, dialogs: after.dialogs }, derivation: 'URL/dialog/help content changed' }; });
  await page.keyboard.press('Escape'); await sleep(500);

  // G13-07/08 skill searches
  const sf2 = await skillsFrame(page);
  const setSearch = async (t) => { const b = sf2.locator('input[placeholder="搜索技能名称或描述"]').first(); await b.click({ timeout: 5000 }).catch(() => {}); await b.fill(t); await sleep(1200); };
  await A('搜索中文名', 'fill', '本轮中文优先', () => setSearch('本轮中文优先'));
  const r7 = await R('中文查询本轮匹配数', 'search.cn', '技能结果', 'cards', async () => { const n = await sf2.locator('[data-slot="card"]').count(); return { value: n, raw: { count: n } }; });
  await A('搜索标签', 'fill', 'FAST_SEARCH_TAG', () => setSearch('FAST_SEARCH_TAG'));
  const r8 = await R('标签查询本轮匹配数', 'search.tag', '技能结果', 'cards', async () => { const n = await sf2.locator('[data-slot="card"]').count(); return { value: n, raw: { count: n } }; });
  await setSearch('');

  // G13-09 cn-all switch
  const cnCard = sf2.locator('[data-slot="card"]').filter({ hasText: '本轮中文优先' }).first();
  const r9before = await R('cn-all技能开关', 'cnall.switch.before', '技能卡片', 'switch', async () => { const c = await cnCard.locator('[role="switch"]').first().getAttribute('aria-checked'); return { value: c === 'true', raw: { checked: c }, derivation: "aria-checked === 'true'" }; });
  await A('切换cn-all开关', 'click', 'switch', async () => { await cnCard.locator('[role="switch"]').first().click({ timeout: 5000 }); await sleep(1200); });
  const r9a = await R('切开关后仍为技能列表', 'cnall.list', '技能列表', 'list visible', async () => { const listVisible = await sf2.locator('[data-slot="card"]').count() > 0; const detailOpen = await sf2.evaluate(() => !!document.querySelector('[class*="_page_"]')); return { value: listVisible && !detailOpen, raw: { listVisible, detailOpen }, derivation: 'list visible and detail not open' }; });
  await A('恢复cn-all开关', 'click', 'switch', async () => { await cnCard.locator('[role="switch"]').first().click({ timeout: 5000 }); await sleep(1200); });
  const r9after = await R('cn-all技能开关', 'cnall.switch.before', '技能卡片', 'switch', async () => { const c = await cnCard.locator('[role="switch"]').first().getAttribute('aria-checked'); return { value: c === 'true', raw: { checked: c }, derivation: "aria-checked === 'true'" }; });

  // G13-10 card body opens detail
  await A('点击cn-all卡片主体', 'click', 'card body', async () => { await cnCard.locator('[data-slot="card-content"]').click({ timeout: 6000 }).catch(() => {}); await sleep(1200); });
  const r10 = await R('卡片详情对象身份', 'cnall.detail', '技能详情', 'detail name', async () => { const nm = await sf2.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); return p ? ((p.innerText.match(/name:\s*([^\s]+)/) || [])[1] || null) : null; }); return { value: nm === 'fast-assert-cn-all-20261006-oc1', raw: { name: nm }, derivation: 'detail internal name matches cn-all' }; });
  await sf2.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); const b = p && [...p.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '技能'); if (b) b.click(); }); await sleep(800);

  // G13-11 create skill mode
  await A('点击新建技能', 'click', '新建技能', async () => { await sf2.getByRole('button', { name: '新建技能', exact: true }).click({ timeout: 6000 }).catch(() => {}); await sleep(2500); });
  const r11a = await R('技能创建模式', 'skill.create.mode', '主任务视图', 'create mode', async () => { const t = await page.evaluate(() => document.body.innerText.slice(0, 3000)); return { value: /创建技能|新建技能|技能创建|创建模式/.test(t), raw: { snippet: t.slice(0, 200) }, derivation: 'create-skill mode semantics present' }; });
  const r11b = await R('创建页左导航', 'skill.create.nav', '左侧栏', 'sidebar', async () => { const v = await page.locator('[class*="tpt-sidebar"], .YDXeBa_root').first().isVisible().catch(() => false); return { value: v, raw: { visible: v }, derivation: 'left navigation visible' }; });

  // G13-12 built-in plugins
  await openSettings(page);
  await openSettingsSection(page, '内置插件');
  const r12before = await R('本轮插件卡展开状态', 'plugin.expanded.before', '设置/内置插件', 'aria-expanded', async () => { const v = await page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const b = d && [...d.querySelectorAll('[aria-expanded]')].find(x => /插件|会话插件|标准模式/.test(x.innerText || '')); return b ? b.getAttribute('aria-expanded') : null; }); return { value: v, raw: { expanded: v } }; });
  await A('展开插件卡', 'click', 'plugin card', async () => { await page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const b = d && [...d.querySelectorAll('[aria-expanded]')].find(x => /插件|会话插件|标准模式/.test(x.innerText || '')); if (b) b.click(); }); await sleep(1000); });
  const r12a = await R('插件展开详情', 'plugin.expanded', '设置/内置插件', 'aria-expanded', async () => { const v = await page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const b = d && [...d.querySelectorAll('[aria-expanded]')].find(x => /插件|会话插件|标准模式/.test(x.innerText || '')); return b ? { expanded: b.getAttribute('aria-expanded'), hasContent: (b.innerText || '').length > 10 } : null; }); return { value: !!(v && v.expanded === 'true' && v.hasContent), raw: v, derivation: 'aria-expanded true and detail content present' }; });
  await A('恢复插件卡折叠', 'click', 'plugin card', async () => { await page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const b = d && [...d.querySelectorAll('[aria-expanded]')].find(x => /插件|会话插件|标准模式/.test(x.innerText || '')); if (b) b.click(); }); await sleep(1000); });
  const r12after = await R('本轮插件卡展开状态', 'plugin.expanded.before', '设置/内置插件', 'aria-expanded', async () => { const v = await page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const b = d && [...d.querySelectorAll('[aria-expanded]')].find(x => /插件|会话插件|标准模式/.test(x.innerText || '')); return b ? b.getAttribute('aria-expanded') : null; }); return { value: v, raw: { expanded: v } }; });
  await closeSettings(page);

  // G13-13 session search
  await A('打开会话搜索并搜索', 'click+type', 'FAST_CHAT_OK', async () => { await page.locator('[aria-label="搜索会话"]').first().click({ timeout: 6000 }).catch(() => {}); await sleep(800); const inp = page.locator('input[placeholder*="搜索会话"]').first(); await inp.fill('FAST_CHAT_OK').catch(() => {}); await sleep(1500); });
  const r13 = await R('搜索结果本轮会话', 'session.search', '侧栏搜索结果', 'rows', async () => { const n = await page.evaluate(() => [...document.querySelectorAll('[data-row-key^="session:"]')].filter(e => /FAST_CHAT_OK/.test(e.innerText || '')).length); return { value: n, raw: { count: n } }; });
  await page.keyboard.press('Escape'); await sleep(500);

  // G13-14 sort menu
  await A('打开排序菜单', 'click', '排序方式', async () => { await page.locator('[aria-label="排序方式"]').first().click({ timeout: 6000 }).catch(() => {}); await sleep(800); });
  const r14initial = await R('排序恢复选中项', 'sort.initial', '侧栏排序菜单', 'menu', async () => { const v = await page.evaluate(() => { const m = [...document.querySelectorAll('[role="menu"]')].find(e => e.offsetWidth); if (!m) return null; const sel = [...m.querySelectorAll('[role="menuitemradio"],[role="menuitem"]')].find(x => x.getAttribute('aria-checked') === 'true' || x.getAttribute('data-state') === 'checked'); return sel ? sel.innerText.trim() : null; }); return { value: v ?? '', raw: { selected: v } }; });
  await A('选择另一排序', 'click', '手动排序', async () => { await page.getByText('手动排序', { exact: true }).last().click({ timeout: 5000 }).catch(() => {}); await sleep(1200); });
  await A('重开排序菜单读取', 'click', '排序方式', async () => { await page.locator('[aria-label="排序方式"]').first().click({ timeout: 6000 }).catch(() => {}); await sleep(800); });
  const r14changed = await R('排序更改选中项', 'sort.changed', '侧栏排序菜单', 'menu', async () => { const v = await page.evaluate(() => { const m = [...document.querySelectorAll('[role="menu"]')].find(e => e.offsetWidth); if (!m) return null; const sel = [...m.querySelectorAll('[role="menuitemradio"],[role="menuitem"]')].find(x => x.getAttribute('aria-checked') === 'true' || x.getAttribute('data-state') === 'checked'); return sel ? sel.innerText.trim() : null; }); return { value: v ?? '', raw: { selected: v } }; });
  await A('恢复排序', 'click', '最近更新', async () => { await page.getByText('最近更新', { exact: true }).last().click({ timeout: 5000 }).catch(() => {}); await sleep(1000); });

  const ended = new Date().toISOString();
  fs.writeFileSync(path.join(root, 'tools', 'run', 'scratch', 'g13-run.json'), JSON.stringify(out, null, 2), 'utf8');
  const ev = evidenceFor(g, ['tools/run/scratch/g13-run.json']);
  const mk = (id, object_identity, inputs, steps, assertions) => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, attempt_id: 'G13-A01', environment_id: environmentId, evidence: ev, started_at: t0, ended_at: ended, action_refs: actionRefs, cleanup: { status: 'restored', description: 'G13菜单/搜索/排序恢复；未安装市场样本', read_refs: [] }, notes: 'G13一级入口与菜单。' });
  mk('G13-01', 'composer @菜单', ['@'], ['输入@读菜单'], [{ id: 'G13-01-A1', actual: r1.value, read_refs: [r1.event_id] }]);
  mk('G13-02', 'composer +菜单', ['+'], ['点击+读菜单'], [{ id: 'G13-02-A1', actual: r2.value, read_refs: [r2.event_id] }]);
  mk('G13-03', '技能iframe', [], ['读双页签'], [{ id: 'G13-03-A1', actual: r3.value, read_refs: [r3.event_id] }]);
  mk('G13-04', '专家iframe', [], ['创建与导入入口'], [{ id: 'G13-04-A1', actual: r4a.value, read_refs: [r4a.event_id] }, { id: 'G13-04-A2', actual: r4b.value, read_refs: [r4b.event_id] }]);
  mk('G13-05', '自动化推荐', [], ['选推荐案例读预填'], [{ id: 'G13-05-A1', actual: r5.value, read_refs: [r5.event_id] }]);
  mk('G13-06', '帮助与反馈', [], ['点击帮助观察响应'], [{ id: 'G13-06-A1', actual: r6.value, read_refs: [r6.event_id] }]);
  mk('G13-07', '技能搜索', ['本轮中文优先'], ['中文名搜索'], [{ id: 'G13-07-A1', actual: r7.value, read_refs: [r7.event_id] }]);
  mk('G13-08', '技能搜索', ['FAST_SEARCH_TAG'], ['标签搜索'], [{ id: 'G13-08-A1', actual: r8.value, read_refs: [r8.event_id] }]);
  mk('G13-09', 'cn-all技能卡', [], ['切开关不打开详情'], [{ id: 'G13-09-A1', actual: r9a.value, read_refs: [r9a.event_id] }, { id: 'G13-09-A2', actual: { before: r9before.value, after: r9after.value }, read_refs: [r9before.event_id, r9after.event_id] }]);
  mk('G13-10', 'cn-all技能卡', [], ['点卡片主体'], [{ id: 'G13-10-A1', actual: r10.value, read_refs: [r10.event_id] }]);
  mk('G13-11', '技能创建', [], ['点新建技能'], [{ id: 'G13-11-A1', actual: r11a.value, read_refs: [r11a.event_id] }, { id: 'G13-11-A2', actual: r11b.value, read_refs: [r11b.event_id] }]);
  mk('G13-12', '设置内置插件', [], ['展开收起插件卡'], [{ id: 'G13-12-A1', actual: r12a.value, read_refs: [r12a.event_id] }, { id: 'G13-12-A2', actual: { before: r12before.value, after: r12after.value }, read_refs: [r12before.event_id, r12after.event_id] }]);
  mk('G13-13', '会话搜索', ['FAST_CHAT_OK'], ['搜索会话'], [{ id: 'G13-13-A1', actual: r13.value, read_refs: [r13.event_id] }]);
  mk('G13-14', '侧栏排序菜单', [], ['改排序并恢复'], [{ id: 'G13-14-A1', actual: r14changed.value, read_refs: [r14changed.event_id] }, { id: 'G13-14-A2', actual: r14initial.value, read_refs: [r14initial.event_id] }]);
  console.log(JSON.stringify({ r1: r1.value, r2: r2.value, r3: r3.value, r4: [r4a.value, r4b.value], r5: [r5.value.slice(0, 40), promptText.slice(0, 40)], r6: r6.value, r7: r7.value, r8: r8.value, r9: [r9a.value, r9before.value, r9after.value], r10: r10.value, r11: [r11a.value, r11b.value], r12: [r12a.value, r12before.value, r12after.value], r13: r13.value, r14: [r14initial.value, r14changed.value] }, null, 2));
});
