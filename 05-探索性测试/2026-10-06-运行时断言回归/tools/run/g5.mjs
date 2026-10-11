import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { withApp, sleep, root, environmentId, evidenceFor, finalizeCase, fixtureRoot, expertsFrame, typeAndSend, waitTerminal, lastAssistantText, SEL } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G5';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, locatorOrFn, fnOr) => { const locator = typeof locatorOrFn === 'function' ? scope : locatorOrFn; const fn = typeof locatorOrFn === 'function' ? locatorOrFn : fnOr; return log.read(target, object_id, { channel: 'dom', scope, locator }, fn); };
const FR = (target, object_id, scope, locator, fn) => log.read(target, object_id, { channel: 'file', scope, locator }, fn);
const MY_NAME = 'fast-assert-expert-20261006-oc1';
const MY_TITLE = '本轮快速回归专家';
const AGENTS_DIR = 'C:\\Users\\Administrator\\.tpt-work\\agents';
const ORIG_DIR = path.join(AGENTS_DIR, MY_NAME);
const hashFile = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const out = {};

await withApp(async (page) => {
  const scope = '专家iframe/supcon-agents';
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(300);
  const refresh = async () => expertsFrame(page);
  let f = await refresh();
  const isDetail = () => f.evaluate(() => /专家详情/.test(document.body.innerText));
  const backToList = async () => { for (let i = 0; i < 3; i++) { if (!(await isDetail())) return; await f.getByRole('button', { name: '专家', exact: true }).first().click({ timeout: 5000 }).catch(() => {}); await sleep(800); } };
  const openMine = async () => {
    await backToList();
    const cards = f.locator('._card_c5z1c_2').filter({ hasText: MY_TITLE });
    const n = await cards.count();
    for (let i = 0; i < n; i++) {
      await cards.nth(i).locator('div.cursor-pointer').first().click({ timeout: 6000 }).catch(async () => { await cards.nth(i).click({ timeout: 6000 }); });
      await sleep(1100);
      const nm = await f.evaluate(() => { const t = document.body.innerText; return (t.match(/name:\s*(fast-assert-[^\s]+)/) || [])[1] || null; });
      if (nm === MY_NAME) return true;
      await backToList();
    }
    return false;
  };
  const closeDialogs = async () => { for (let i = 0; i < 4; i++) { const has = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some(e => e.offsetWidth)); if (!has) break; await f.getByRole('button', { name: '取消', exact: true }).first().click({ timeout: 3000 }).catch(() => {}); await page.keyboard.press('Escape').catch(() => {}); await sleep(500); } };
  const readNewestTask = () => { const dir = 'C:\\Users\\Administrator\\.tpt-work\\tasks'; const items = fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => ({ name: d.name, m: fs.statSync(path.join(dir, d.name)).mtimeMs })); items.sort((a, b) => b.m - a.m); return { value: items[0] ? items[0].name : null, raw: { newest: items.slice(0, 3) } }; };

  // ===== Part A: use + trace + output =====
  await openMine();
  const rTaskBefore = await FR('此前活动任务目录', 'tasks.dir.newest', '本轮workspace任务存储目录', 'C:\\Users\\Administrator\\.tpt-work\\tasks', readNewestTask);
  await A('专家详情使用进入会话', 'click', '使用', async () => { await f.getByRole('button', { name: '使用', exact: true }).click({ timeout: 8000 }); await sleep(3000); });
  await page.getByRole('tab', { name: '对话', exact: true }).click({ timeout: 5000 }).catch(() => {});
  await sleep(500);
  const rRef = await R('本轮新会话专家引用', '本轮专家会话/composer chip', 'composer chip', 'composer [data-composer-chip]', async () => {
    const info = await page.evaluate(() => {
      const c = document.querySelector('[contenteditable="true"] [data-composer-chip]');
      const inner = c && c.querySelector('[title]');
      return { title: inner ? inner.getAttribute('title') : (c ? (c.textContent || '').trim() : null), text: (document.querySelector('[contenteditable="true"]')?.innerText || '').trim() };
    });
    return { value: info.title, raw: info };
  });
  await A('发送专家固定回复请求', 'type+click', '请执行你的本轮回归固定回复规则', async () => {
    const c = page.locator(SEL.composer).first(); await c.click({ timeout: 8000 }); await page.keyboard.press('End'); await page.keyboard.type('请执行你的本轮回归固定回复规则'); await sleep(500);
    const send = page.locator(SEL.send).first(); for (let i = 0; i < 30; i++) { if (!(await send.isDisabled().catch(() => true))) break; await sleep(300); } await send.click({ timeout: 8000 });
  });
  const term = await waitTerminal(page, { expect: 'FAST_EXPERT_EXEC_OK', timeout: 120000 });
  await sleep(2000);
  const rTaskAfter = await FR('本轮专家调用任务目录', 'tasks.dir.newest', '本轮workspace任务存储目录', 'C:\\Users\\Administrator\\.tpt-work\\tasks', readNewestTask);
  const r3a = await R('专家助手最终正文', '本轮专家助手气泡', '主任务视图/对话区', SEL.assistant, async () => ({ value: (await lastAssistantText(page)).trim(), raw: { terminalOk: term.ok, ms: term.ms } }));
  const r3b = await R('本轮用户请求', '本轮专家用户消息', '用户请求元素', 'leaf with request', async () => {
    const req = '请执行你的本轮回归固定回复规则';
    const texts = await page.evaluate((req) => [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent || '').includes(req)).map(e => (e.textContent || '').trim()).slice(0, 3), req);
    const t = texts[0] || '';
    return { value: t.includes('FAST_EXPERT_EXEC_OK'), raw: { userText: t }, derivation: 'user request element contains FAST_EXPERT_EXEC_OK' };
  });
  await A('打开轨迹读取专家资源', 'click', '轨迹', async () => { await page.getByRole('tab', { name: '轨迹', exact: true }).click({ timeout: 8000 }).catch(() => {}); await sleep(2000); });
  const r2 = await R('本轮专家Trace', '本轮专家Trace面板', '主任务视图/轨迹', 'trace text', async () => {
    const txt = await page.evaluate(() => (document.querySelector('main')?.innerText || document.body.innerText || '').slice(0, 30000));
    const names = [];
    if (txt.includes('agent-fast-assert-expert-20261006-oc1')) names.push('agent-fast-assert-expert-20261006-oc1');
    return { value: names, raw: { hasName: names.length > 0 }, derivation: 'trace text contains expert resource name' };
  });

  // ===== Part B: conflict + copy + original unchanged =====
  f = await refresh();
  await closeDialogs(); await backToList();
  const rOrigAgentBefore = await FR('原安装专家agent.md实际绝对路径', path.join(ORIG_DIR, 'agent.md'), '本轮原安装专家目录', path.join(ORIG_DIR, 'agent.md'), () => ({ value: hashFile(path.join(ORIG_DIR, 'agent.md')) }));
  const rOrigMetaBefore = await FR('原安装专家metadata.json实际绝对路径', path.join(ORIG_DIR, 'metadata.json'), '本轮原安装专家目录', path.join(ORIG_DIR, 'metadata.json'), () => ({ value: hashFile(path.join(ORIG_DIR, 'metadata.json')) }));
  const dirsBefore = fs.readdirSync(AGENTS_DIR);
  await A('再次导入同名专家目录', 'setInputFiles+click', 'expert-import', async () => {
    await f.getByRole('button', { name: '导入专家', exact: true }).click({ timeout: 8000 }); await sleep(1000);
    await f.locator('input[type="file"][webkitdirectory]').first().setInputFiles(path.join(fixtureRoot, 'expert-import')); await sleep(800);
    await f.getByRole('button', { name: '提交', exact: true }).click({ timeout: 8000 }); await sleep(2000);
  });
  const r4 = await R('同名冲突弹窗', '专家冲突弹窗', '导入弹窗', 'conflict options', async () => {
    const raw = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].filter(b => b.offsetWidth).map(b => (b.innerText || '').trim()));
    return { value: raw.includes('覆盖现有') && raw.includes('作为副本'), raw: { buttons: raw }, derivation: 'both 覆盖现有 and 作为副本 present' };
  });
  // record copy path before choosing
  await A('同名导入选择作为副本', 'click', '作为副本', async () => { await f.getByRole('button', { name: '作为副本', exact: true }).click({ timeout: 5000 }); await sleep(3000); });
  await closeDialogs();
  const dirsAfter = fs.readdirSync(AGENTS_DIR);
  const newDirs = dirsAfter.filter(d => !dirsBefore.includes(d));
  const copyDir = newDirs.length ? path.join(AGENTS_DIR, newDirs[0]) : null;
  out.copy = { newDirs, copyDir };
  const r5a = await FR('原专家实际安装目录', 'agents.dir.original', '本轮agents安装目录', ORIG_DIR, () => ({ value: ORIG_DIR }));
  const r5copy = await FR('副本实际安装目录', 'agents.dir.copy', '本轮agents安装目录', copyDir || 'missing', () => ({ value: copyDir }));
  const r5b = await FR('副本实际目录', copyDir || 'missing', '本轮agents安装目录', copyDir || 'missing', () => ({ value: !!copyDir && fs.existsSync(path.join(copyDir, 'agent.md')) && fs.existsSync(path.join(copyDir, 'metadata.json')), raw: { copyDir, agent: copyDir && fs.existsSync(path.join(copyDir, 'agent.md')), meta: copyDir && fs.existsSync(path.join(copyDir, 'metadata.json')) }, derivation: 'copyDir has agent.md and metadata.json' }));
  const rOrigAgentAfter = await FR('原安装专家agent.md实际绝对路径', path.join(ORIG_DIR, 'agent.md'), '本轮原安装专家目录', path.join(ORIG_DIR, 'agent.md'), () => ({ value: hashFile(path.join(ORIG_DIR, 'agent.md')) }));
  const rOrigMetaAfter = await FR('原安装专家metadata.json实际绝对路径', path.join(ORIG_DIR, 'metadata.json'), '本轮原安装专家目录', path.join(ORIG_DIR, 'metadata.json'), () => ({ value: hashFile(path.join(ORIG_DIR, 'metadata.json')) }));

  // ===== Part C: bad packages =====
  const countExperts = () => f.evaluate(() => document.querySelectorAll('._card_c5z1c_2').length);
  const importDir = async (dir) => {
    await f.getByRole('button', { name: '导入专家', exact: true }).click({ timeout: 8000 }); await sleep(1000);
    await f.locator('input[type="file"][webkitdirectory]').first().setInputFiles(dir); await sleep(800);
    await f.getByRole('button', { name: '提交', exact: true }).click({ timeout: 8000 }); await sleep(2500);
    const dlg = await f.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); return d ? d.innerText.replace(/\s+/g, ' ') : '(closed)'; });
    return dlg;
  };
  const cntBefore7 = await countExperts();
  const rCnt7Before = await R('专家列表数量', '专家列表总数', '我的专家列表', 'card count', async () => ({ value: cntBefore7, raw: { count: cntBefore7 } }));
  const dlg7 = await importDir(path.join(fixtureRoot, 'expert-missing-agent'));
  const dlg7open = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some(e => e.offsetWidth));
  await closeDialogs();
  const cntAfter7 = await countExperts();
  const invalid7Dir = path.join(AGENTS_DIR, 'fast-reg-invalid-missing-agent');
  const reject7 = dlg7open && cntAfter7 === cntBefore7 && !fs.existsSync(invalid7Dir);
  const r7a = await R('缺文件包提交反馈', '专家导入缺文件反馈', '导入弹窗', 'dialog text', async () => ({ value: reject7, raw: { dialog: dlg7.slice(0, 300), dialogOpen: dlg7open, cntBefore: cntBefore7, cntAfter: cntAfter7, invalidDir: fs.existsSync(invalid7Dir) }, derivation: 'dialog stayed open, count unchanged, no invalid object created' }));
  const r7b = await R('专家列表数量', '专家列表总数', '我的专家列表', 'card count', async () => ({ value: cntAfter7, raw: { count: cntAfter7 } }));

  await closeDialogs();
  const badMeta = path.join(fixtureRoot, 'expert-bad-json', 'metadata.json');
  const badAgent = path.join(fixtureRoot, 'expert-bad-json', 'agent.md');
  const rBadMetaBefore = await FR('坏包源metadata.json绝对路径', badMeta, '坏包源包', badMeta, () => ({ value: hashFile(badMeta) }));
  const rBadAgentBefore = await FR('坏包源agent.md绝对路径', badAgent, '坏包源包', badAgent, () => ({ value: hashFile(badAgent) }));
  const cntBefore8 = await countExperts();
  const rCnt8Before = await R('专家列表数量', '专家列表总数', '我的专家列表', 'card count', async () => ({ value: cntBefore8, raw: { count: cntBefore8 } }));
  const dlg8 = await importDir(path.join(fixtureRoot, 'expert-bad-json'));
  const dlg8open = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some(e => e.offsetWidth));
  await closeDialogs();
  const cntAfter8 = await countExperts();
  const invalid8Dir = path.join(AGENTS_DIR, 'fast-reg-invalid-json');
  const reject8 = dlg8open && cntAfter8 === cntBefore8 && !fs.existsSync(invalid8Dir);
  const r8a = await R('坏JSON提交反馈', '专家导入坏JSON反馈', '导入弹窗', 'dialog text', async () => ({ value: reject8, raw: { dialog: dlg8.slice(0, 300), dialogOpen: dlg8open, cntBefore: cntBefore8, cntAfter: cntAfter8, invalidDir: fs.existsSync(invalid8Dir) }, derivation: 'dialog stayed open, count unchanged, no invalid object created' }));
  const r8b = await R('专家列表数量', '专家列表总数', '我的专家列表', 'card count', async () => ({ value: cntAfter8, raw: { count: cntAfter8 } }));
  const rBadMetaAfter = await FR('坏包源metadata.json绝对路径', badMeta, '坏包源包', badMeta, () => ({ value: hashFile(badMeta) }));
  const rBadAgentAfter = await FR('坏包源agent.md绝对路径', badAgent, '坏包源包', badAgent, () => ({ value: hashFile(badAgent) }));

  const ended = new Date().toISOString();
  fs.writeFileSync(path.join(root, 'tools', 'run', 'scratch', 'g5-run.json'), JSON.stringify(out, null, 2), 'utf8');
  const ev = evidenceFor(g, ['tools/run/scratch/g5-run.json']);
  const mk = (id, object_identity, inputs, steps, assertions) => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, attempt_id: 'G5-A01', environment_id: environmentId, evidence: ev, started_at: t0, ended_at: ended, action_refs: actionRefs, cleanup: { status: 'retained', description: '本轮专家与副本保留待审；坏包源文件不变', read_refs: [] }, notes: 'G5共享一次专家调用、同名副本导入与两个坏包提交。' });
  mk('G5-01', '本轮新会话专家引用', ['使用入口'], ['详情使用', '读取composer chip'], [{ id: 'G5-01-A1', actual: rRef.value, read_refs: [rRef.event_id] }]);
  mk('G5-02', '本轮专家Trace', ['请执行你的本轮回归固定回复规则'], ['打开轨迹读取资源'], [{ id: 'G5-02-A1', actual: r2.value, read_refs: [r2.event_id] }]);
  mk('G5-03', '专家助手最终正文', ['请执行你的本轮回归固定回复规则'], ['读取助手正文与用户请求'], [{ id: 'G5-03-A1', actual: r3a.value, read_refs: [r3a.event_id] }, { id: 'G5-03-A2', actual: r3b.value, read_refs: [r3b.event_id] }]);
  mk('G5-04', '同名冲突弹窗', ['expert-import'], ['再次提交同名目录'], [{ id: 'G5-04-A1', actual: r4.value, read_refs: [r4.event_id] }]);
  mk('G5-05', '原专家与副本实际安装目录', ['作为副本'], ['选择作为副本', '读取副本目录'], [{ id: 'G5-05-A1', actual: { before: r5a.value, after: r5copy.value }, read_refs: [r5a.event_id, r5copy.event_id] }, { id: 'G5-05-A2', actual: r5b.value, read_refs: [r5b.event_id] }]);
  mk('G5-06', '原安装专家文件', ['作为副本'], ['副本导入前后哈希同一原文件'], [{ id: 'G5-06-A1', actual: { before: rOrigAgentBefore.value, after: rOrigAgentAfter.value }, read_refs: [rOrigAgentBefore.event_id, rOrigAgentAfter.event_id] }, { id: 'G5-06-A2', actual: { before: rOrigMetaBefore.value, after: rOrigMetaAfter.value }, read_refs: [rOrigMetaBefore.event_id, rOrigMetaAfter.event_id] }]);
  mk('G5-07', '缺文件包提交反馈', ['expert-missing-agent'], ['提交缺agent.md目录'], [{ id: 'G5-07-A1', actual: r7a.value, read_refs: [r7a.event_id] }, { id: 'G5-07-A2', actual: { before: rCnt7Before.value, after: r7b.value }, read_refs: [rCnt7Before.event_id, r7b.event_id] }]);
  mk('G5-08', '坏JSON提交反馈', ['expert-bad-json'], ['提交坏JSON目录'], [{ id: 'G5-08-A1', actual: r8a.value, read_refs: [r8a.event_id] }, { id: 'G5-08-A2', actual: { before: rCnt8Before.value, after: r8b.value }, read_refs: [rCnt8Before.event_id, r8b.event_id] }, { id: 'G5-08-A3', actual: { before: rBadMetaBefore.value, after: rBadMetaAfter.value }, read_refs: [rBadMetaBefore.event_id, rBadMetaAfter.event_id] }, { id: 'G5-08-A4', actual: { before: rBadAgentBefore.value, after: rBadAgentAfter.value }, read_refs: [rBadAgentBefore.event_id, rBadAgentAfter.event_id] }]);
  console.log(JSON.stringify({ ref: rRef.value, trace: r2.value, out3: r3a.value, conflict: r4.value, copy: out.copy, origSameAgent: rOrigAgentBefore.value === rOrigAgentAfter.value, reject7, reject8, dlg7: dlg7.slice(0, 120), dlg8: dlg8.slice(0, 120) }, null, 2));
});
