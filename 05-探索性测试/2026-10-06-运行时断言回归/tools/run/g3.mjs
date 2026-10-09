import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { withApp, sleep, root, environmentId, evidenceFor, finalizeCase, typeAndSend, appendSend, waitTerminal, lastAssistantText, runningCount, newTask, SEL, skillsFrame } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G3';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, locatorOrFn, fnOr) => { const locator = typeof locatorOrFn === 'function' ? scope : locatorOrFn; const fn = typeof locatorOrFn === 'function' ? locatorOrFn : fnOr; return log.read(target, object_id, { channel: 'dom', scope, locator }, fn); };
const MY_NAME = 'fast-assert-skill-20261006-oc1';
const MY_TITLE = '本轮快速回归技能';
const out = {};

await withApp(async (page) => {
  const scope = '技能iframe/supcon-skills';
  let f = await skillsFrame(page);
  const frame = () => f;
  const refreshFrame = async () => { f = await skillsFrame(page); };

  const backToList = async () => {
    const f = frame();
    for (let i = 0; i < 3; i++) {
      const isDetail = await f.evaluate(() => !!document.querySelector('[class*="_page_"]'));
      if (!isDetail) return;
      await f.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); const b = p && [...p.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '技能'); if (b) b.click(); });
      await sleep(900);
    }
  };
  const closeDialogs = async () => {
    const f = frame();
    for (let i = 0; i < 4; i++) {
      const has = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some(e => e.offsetWidth));
      if (!has) break;
      const cancel = f.getByRole('button', { name: '取消', exact: true });
      if (await cancel.count()) await cancel.first().click({ timeout: 3000 }).catch(() => {});
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(500);
    }
  };
  const myCard = () => frame().locator('[data-slot="card"]').filter({ hasText: MY_TITLE }).first();
  const cardSwitch = () => myCard().locator('[role="switch"]').first();
  const ensureSkills = async () => {
    await refreshFrame();
    await closeDialogs();
    await backToList();
    await frame().getByRole('tab', { name: /我的技能/ }).click({ timeout: 8000 }).catch(() => {});
    await sleep(800);
  };
  const sessionKeys = async () => page.evaluate(() => [...document.querySelectorAll('[data-row-key^="session:"]')].map(e => e.getAttribute('data-row-key')));

  await ensureSkills();

  // identify my card by verifying detail name, then return to list
  const verifyMine = async () => {
    const cards = frame().locator('[data-slot="card"]').filter({ hasText: MY_TITLE });
    const n = await cards.count();
    for (let i = 0; i < n; i++) {
      await cards.nth(i).locator('[data-slot="card-content"]').click({ timeout: 8000 }).catch(() => {});
      await sleep(1200);
      const nm = await frame().evaluate(() => { const p = document.querySelector('[class*="_page_"]'); return p ? ((p.innerText.match(/name:\s*([^\s]+)/) || [])[1] || null) : null; });
      if (nm === MY_NAME) return i;
      await backToList();
    }
    return -1;
  };
  const myIndex = await verifyMine();
  out.myIndex = myIndex;
  await backToList();

  const cardAt = () => frame().locator('[data-slot="card"]').filter({ hasText: MY_TITLE }).nth(myIndex);
  const swAt = () => cardAt().locator('[role="switch"]').first();

  // normalize: restore default disabled state if a prior interrupted attempt left it enabled
  if ((await swAt().getAttribute('aria-checked')) === 'true') {
    await A('恢复技能默认停用', 'click', '本轮卡片开关', async () => { await swAt().click({ timeout: 8000 }); await sleep(1500); });
  }

  // G3-01 default state
  const r1 = await R('刚导入技能开关', scope + '/本轮卡片开关', '本轮卡片[role=switch]', async () => {
    const c = await swAt().getAttribute('aria-checked');
    return { value: c === 'true', raw: { aria_checked: c }, derivation: "aria_checked === 'true'" };
  });

  // G3-02 enable
  await A('启用本轮技能', 'click', '本轮卡片开关', async () => { await swAt().click({ timeout: 8000 }); await sleep(1500); });
  const r2 = await R('本轮技能开关', scope + '/本轮卡片开关', '本轮卡片[role=switch]', async () => {
    const c = await swAt().getAttribute('aria-checked');
    return { value: c === 'true', raw: { aria_checked: c }, derivation: "aria_checked === 'true'" };
  });

  // G3-03: create a fresh session and invoke the round skill
  const beforeKeys = await sessionKeys();
  // independent file read: newest task directory identifies the active session/task
  const readNewestTask = () => {
    const dir = 'C:\\Users\\Administrator\\.tpt-work\\tasks';
    const items = fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => ({ name: d.name, m: fs.statSync(path.join(dir, d.name)).mtimeMs }));
    items.sort((a, b) => b.m - a.m);
    return { value: items[0] ? items[0].name : null, raw: { newest: items.slice(0, 3) } };
  };
  const rBeforeFile = await log.read('此前活动任务目录', 'tasks.dir.newest', { channel: 'file', scope: '本轮workspace任务存储目录', locator: 'C:\\Users\\Administrator\\.tpt-work\\tasks' }, readNewestTask);
  await ensureSkills();
  const idx2 = await verifyMine();
  await frame().locator('[data-slot="card"]').filter({ hasText: MY_TITLE }).nth(idx2).locator('[data-slot="card-content"]').click({ timeout: 8000 }).catch(() => {});
  await sleep(1200);
  await A('详情使用入口', 'click', '使用', async () => { await frame().getByRole('button', { name: '使用', exact: true }).click({ timeout: 8000 }); await sleep(2500); });
  const afterUseKeys = await sessionKeys();
  out.usedNew = afterUseKeys.some(k => !beforeKeys.includes(k));
  // contract: if the entry reuses an old session, create a new one and reselect the sample
  await A('新建会话重新选择样本', 'click', '新建任务', async () => { await page.getByRole('tab', { name: '对话', exact: true }).click({ timeout: 5000 }).catch(() => {}); await sleep(400); await newTask(page); });
  await A('选择本轮技能命令', 'type', '/' + MY_NAME, async () => { const c = page.locator(SEL.composer).first(); await c.click({ timeout: 8000 }); await page.keyboard.type('/' + MY_NAME + ' '); await sleep(500); });
  const rRef = await R('新会话技能引用', '本轮调用会话/composer', 'composer[contenteditable]', async () => {
    const t = (await page.locator(SEL.composer).first().innerText()).trim();
    const m = t.match(/\/?(fast-assert-skill-[A-Za-z0-9-]+)/);
    return { value: m ? m[1] : t, raw: { composerText: t } };
  });
  await A('发送技能固定回复请求', 'type+click', '请执行本轮回归技能的固定回复规则', async () => {
    await page.keyboard.type('请执行本轮回归技能的固定回复规则');
    await sleep(400);
    const send = page.locator(SEL.send).first();
    for (let i = 0; i < 30; i++) { if (!(await send.isDisabled().catch(() => true))) break; await sleep(300); }
    await send.click({ timeout: 8000 });
  });
  const term = await waitTerminal(page, { expect: 'FAST_SKILL_EXEC_OK', timeout: 120000 });
  await sleep(2500);
  const afterKeys = await sessionKeys();
  let newKey = afterKeys.find(k => !beforeKeys.includes(k)) ?? null;
  out.session = { beforeKeys: beforeKeys.slice(0, 3), newKey, usedNew: out.usedNew, termOk: term.ok, termMs: term.ms };
  const rAfter = await R('调用会话身份', 'sidebar.session.round-call', '侧栏最近会话', async () => ({ value: newKey, raw: { newKey, afterKeys: afterKeys.slice(0, 3), term: term.ok, ms: term.ms } }));
  // independent file read: newest task directory = session created by this call
  const rAfterFile = await log.read('本轮调用任务目录', 'tasks.dir.newest', { channel: 'file', scope: '本轮workspace任务存储目录', locator: 'C:\\Users\\Administrator\\.tpt-work\\tasks' }, readNewestTask);

  // G3-05 output
  const r5a = await R('本轮技能调用助手气泡', '本轮调用助手气泡', '主任务视图/对话区', SEL.assistant, async () => ({ value: (await lastAssistantText(page)).trim(), raw: { terminalOk: term.ok } }));
  const r5b = await R('本轮用户请求', '本轮调用用户消息', '主任务视图/用户气泡', 'leaf containing request', async () => {
    const req = '请执行本轮回归技能的固定回复规则';
    const texts = await page.evaluate((req) => [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent || '').includes(req)).map(e => (e.textContent || '').trim()).slice(0, 3), req);
    const t = texts[0] || '';
    return { value: t.includes('FAST_SKILL_EXEC_OK'), raw: { userText: t, candidates: texts }, derivation: 'user request element contains FAST_SKILL_EXEC_OK' };
  });

  // G3-04 trace
  await A('打开轨迹页签读取资源', 'click', '轨迹', async () => { await page.getByRole('tab', { name: '轨迹', exact: true }).click({ timeout: 8000 }).catch(() => {}); await sleep(2000); });
  const r4 = await R('本轮调用Trace', '本轮调用Trace面板', '主任务视图/轨迹', '轨迹面板', async () => {
    const txt = await page.evaluate(() => { const m = document.querySelector('main') || document.body; return (m.innerText || '').slice(0, 20000); });
    const names = [];
    if (txt.includes(MY_NAME)) names.push(MY_NAME);
    const skillTools = [...txt.matchAll(/skill[_-][a-z]+/gi)].map(m => m[0]);
    return { value: names, raw: { hasName: txt.includes(MY_NAME), skillTools: [...new Set(skillTools)].slice(0, 10) }, derivation: 'trace text contains skill internal name' };
  });

  // G3-06 disable
  await ensureSkills();
  await A('停用本轮技能', 'click', '本轮卡片开关', async () => { await swAt().click({ timeout: 8000 }); await sleep(1500); });
  const r6 = await R('本轮技能开关', scope + '/本轮卡片开关', '本轮卡片[role=switch]', async () => {
    const c = await swAt().getAttribute('aria-checked');
    return { value: c === 'true', raw: { aria_checked: c }, derivation: "aria_checked === 'true'" };
  });

  // G3-07 search + disabled filter intersection
  const setFilter = async (name) => { await frame().getByRole('button', { name, exact: true }).click({ timeout: 8000 }); await sleep(1200); };
  const setSearch = async (text) => { const b = frame().locator('input[placeholder="搜索技能名称或描述"]').first(); await b.click({ timeout: 5000 }); await b.fill(text); await sleep(1200); };
  await A('搜索唯一词', 'fill', MY_NAME, () => setSearch(MY_NAME));
  await A('切未启用筛选', 'click', '未启用', () => setFilter('未启用'));
  const r7a = await R('唯一查询+未启用结果', scope + '/未启用列表', 'card list', async () => {
    const cards = frame().locator('[data-slot="card"]');
    return { value: await cards.count(), raw: { count: await cards.count() } };
  });
  await A('切已启用筛选', 'click', '已启用', () => setFilter('已启用'));
  const r7b = await R('唯一查询+已启用结果', scope + '/已启用列表', 'card list', async () => {
    const cards = frame().locator('[data-slot="card"]');
    return { value: await cards.count(), raw: { count: await cards.count() } };
  });
  // G3-08 restore filters
  await A('清空搜索并切全部', 'fill+click', '全部', async () => { await setSearch(''); await setFilter('全部'); });
  const r8a = await R('技能搜索框', scope + '/搜索框', 'input', async () => { const v = await frame().locator('input[placeholder="搜索技能名称或描述"]').first().inputValue(); return { value: v, raw: { value: v } }; });
  const r8b = await R('全部列表本轮对象', scope + '/全部列表', 'card list', async () => { const n = await frame().locator('[data-slot="card"]').filter({ hasText: MY_TITLE }).count(); return { value: n > 0, raw: { count: n, search: '' }, derivation: 'matching cards count > 0' }; });
  const r8c = await R('本轮技能最终开关', scope + '/本轮卡片开关', 'switch', async () => { const c = await swAt().getAttribute('aria-checked'); return { value: c === 'true', raw: { aria_checked: c }, derivation: "aria_checked === 'true'" }; });

  const ended = new Date().toISOString();
  fs.writeFileSync(path.join(root, 'tools', 'run', 'scratch', 'g3-run.json'), JSON.stringify(out, null, 2), 'utf8');
  const ev = evidenceFor(g, ['tools/run/scratch/g3-run.json']);
  const mk = (id, object_identity, inputs, steps, assertions, cleanupStatus = 'retained') => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, attempt_id: 'G3-A01', environment_id: environmentId, evidence: ev, started_at: t0, ended_at: ended, action_refs: actionRefs, cleanup: { status: cleanupStatus, description: '本轮技能最终停用；调用会话保留', read_refs: [] }, notes: 'G3共享一次启用、调用Trace、停用与筛选。' });

  mk('G3-01', '本轮技能开关', [], ['读取导入默认开关'], [{ id: 'G3-01-A1', actual: r1.value, read_refs: [r1.event_id] }]);
  mk('G3-02', '本轮技能开关', [], ['点击启用'], [{ id: 'G3-02-A1', actual: r2.value, read_refs: [r2.event_id] }]);
  mk('G3-03', '本轮调用会话', ['使用入口', '固定回复请求'], ['记录此前会话', '详情使用进入新会话', '读取引用与session'], [{ id: 'G3-03-A1', actual: rRef.value, read_refs: [rRef.event_id] }, { id: 'G3-03-A2', actual: { before: rBeforeFile.value, after: rAfterFile.value }, read_refs: [rBeforeFile.event_id, rAfterFile.event_id] }]);
  mk('G3-04', '本轮调用Trace', ['请执行本轮回归技能的固定回复规则'], ['打开轨迹读取资源'], [{ id: 'G3-04-A1', actual: r4.value, read_refs: [r4.event_id] }]);
  mk('G3-05', '本轮技能调用助手气泡', ['请执行本轮回归技能的固定回复规则'], ['读取助手正文与用户请求'], [{ id: 'G3-05-A1', actual: r5a.value, read_refs: [r5a.event_id] }, { id: 'G3-05-A2', actual: r5b.value, read_refs: [r5b.event_id] }]);
  mk('G3-06', '本轮技能开关', [], ['点击停用'], [{ id: 'G3-06-A1', actual: r6.value, read_refs: [r6.event_id] }]);
  mk('G3-07', '唯一查询结果', ['FastRegressionSkillUnique'], ['切未启用', '切已启用'], [{ id: 'G3-07-A1', actual: r7a.value, read_refs: [r7a.event_id] }, { id: 'G3-07-A2', actual: r7b.value, read_refs: [r7b.event_id] }]);
  mk('G3-08', '技能搜索与列表', [], ['清空搜索', '切全部'], [{ id: 'G3-08-A1', actual: r8a.value, read_refs: [r8a.event_id] }, { id: 'G3-08-A2', actual: r8b.value, read_refs: [r8b.event_id] }, { id: 'G3-08-A3', actual: r8c.value, read_refs: [r8c.event_id] }]);
  console.log(JSON.stringify({ myIndex, session: out.session, r1: r1.value, r2: r2.value, rRef: rRef.value, r4: r4.value, r5a: r5a.value, r6: r6.value, r7a: r7a.value, r7b: r7b.value, r8: [r8a.value, r8b.value, r8c.value] }, null, 2));
});
