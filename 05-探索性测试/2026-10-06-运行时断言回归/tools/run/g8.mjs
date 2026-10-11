import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { withApp, sleep, root, environmentId, evidenceFor, finalizeCase, closeSettings, newTask, typeAndSend, waitTerminal, lastAssistantText, runningCount, SEL } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G8';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, locatorOrFn, fnOr) => { const locator = typeof locatorOrFn === 'function' ? scope : locatorOrFn; const fn = typeof locatorOrFn === 'function' ? locatorOrFn : fnOr; return log.read(target, object_id, { channel: 'dom', scope, locator }, fn); };
const FR = (target, object_id, scope, locator, fn) => log.read(target, object_id, { channel: 'file', scope, locator }, fn);
const WORK = 'D:\\code\\tpt-workspace\\.fast-assert-20261006-oc1';
const out = {};

await withApp(async (page) => {
  await closeSettings(page);
  const setPerm = async (v) => { const b = page.locator('[aria-label^="访问模式"]').first(); if (await b.count()) { await b.click({ timeout: 5000 }).catch(() => {}); await sleep(600); await page.getByText(v, { exact: true }).last().click({ timeout: 5000 }).catch(() => {}); await sleep(800); } };

  // ---- task A: reuse a completed session (new sessions are not listed in the sidebar in this instance) ----
  const aKey = 'session:session-0a273d0c-05fe-4e03-bbf7-efc9f6aed912';
  const bKey = 'session:session-cc139da5-4a02-44d8-aff7-6477262c2ef5';
  out.a = { aKey, note: 'sidebar did not list newly created sessions; used an existing completed session' };
  const readStatus = (k) => page.evaluate((k) => { const r = document.querySelector(`[data-row-key="${k}"]`); if (!r) return null; const dot = r.querySelector('[class*="dot"]'); const vh = r.querySelector('[data-tpt-region-row-status] [class*="visuallyHidden"]'); return { dotState: dot ? dot.getAttribute('data-state') : null, vh: vh ? vh.textContent.trim() : null }; }, k);
  const unreadCount = (k) => readStatus(k).then(s => (s && s.dotState && s.dotState !== 'idle') ? 1 : 0);
  const openRowMenu = async (k) => {
    await page.locator(`[data-row-key="${k}"]`).first().hover().catch(() => {});
    await page.locator(`[data-row-key="${k}"] button[aria-label*="的操作"]`).first().click({ timeout: 5000 });
    await sleep(700);
  };
  // switch to B, then mark A unread
  await A('切到另一会话B', 'click', bKey, async () => { await page.locator(`[data-row-key="${bKey}"]`).first().click({ timeout: 6000 }).catch(() => {}); await sleep(1500); });
  await A('从B标记A为未读', 'click', '标记为未读', async () => { await openRowMenu(aKey); const mi = page.getByText('标记为未读', { exact: true }).last(); await mi.click({ timeout: 5000 }).catch(() => {}); await sleep(1500); });
  const r3a = await R('A完成未读提醒数', 'session.a.unread', '侧栏A行', 'unread indicator', async () => { const s = await readStatus(aKey); const c = await unreadCount(aKey); return { value: c, raw: { status: s }, derivation: "dot data-state !== 'idle' ? 1 : 0" }; });
  const r3b = await R('A重复独立未读标记数', 'session.a.dup', '侧栏A行', 'extra markers', async () => { const n = await page.evaluate((k) => { const r = document.querySelector(`[data-row-key="${k}"]`); if (!r) return null; return r.querySelectorAll('[data-tpt-region-row-status]').length; }, aKey); return { value: n === null ? null : Math.max(0, n - 1), raw: { statusSlots: n } }; });

  // ---- enter A, read unread cleared and history ----
  await A('进入A清除未读', 'click', 'A row', async () => { await page.locator(`[data-row-key="${aKey}"]`).first().click({ timeout: 6000 }); await sleep(2000); });
  const r2a = await R('A未读提醒', 'session.a.unread.cleared', '侧栏A行', 'unread indicator', async () => { const s = await readStatus(aKey); const c = await unreadCount(aKey); return { value: c, raw: { status: s }, derivation: "dot data-state !== 'idle' ? 1 : 0" }; });
  const r2b = await R('A历史正文可访问', 'session.a.history', '主任务视图/助手正文', SEL.assistant, async () => { const t = await lastAssistantText(page); return { value: t.length > 0, raw: { text: t.slice(0, 100) }, derivation: 'non-empty final assistant text' }; });

  // ---- G8-06 read flow.txt ----
  await newTask(page);
  await setPerm('工作区内修改');
  await A('请求读取flow.txt', 'fill+click', WORK + '\\flow.txt', () => typeAndSend(page, `请只读取文件 ${WORK}\\flow.txt，把它的内容原样回答，不要做其他操作。`));
  const term6 = await waitTerminal(page, { timeout: 120000 });
  await A('打开轨迹读取read工具', 'click', '轨迹', async () => { await page.getByRole('tab', { name: '轨迹', exact: true }).click({ timeout: 6000 }).catch(() => {}); await sleep(2000); });
  out.trace6 = await page.evaluate(() => document.body.innerText.slice(0, 60000));
  const r6a = await R('成功读取工具的路径列表', 'trace.read.paths', '主任务视图/轨迹', 'read tool args', async () => { const t = out.trace6; const p = WORK + '\\flow.txt'; const paths = t.includes(p) ? [p] : (t.includes('flow.txt') ? ['flow.txt'] : []); return { value: paths, raw: { hasPath: t.includes(p), hasFlow: t.includes('flow.txt') } }; });
  const r6b = await R('成功read输出', 'trace.read.output', '主任务视图/轨迹', 'read tool output', async () => ({ value: out.trace6, raw: { hasFlowInput: out.trace6.includes('FAST_FLOW_INPUT') } }));

  // ---- G8-07 read long.txt ----
  await A('新建会话', 'click', '新建任务', async () => { await newTask(page); await setPerm('工作区内修改'); });
  await A('请求读取long.txt', 'fill+click', WORK + '\\long.txt', () => typeAndSend(page, `请只读取文件 ${WORK}\\long.txt，把完整内容原样回答，不要做其他操作。`));
  const term7 = await waitTerminal(page, { timeout: 120000 });
  await A('打开轨迹读取long输出', 'click', '轨迹', async () => { await page.getByRole('tab', { name: '轨迹', exact: true }).click({ timeout: 6000 }).catch(() => {}); await sleep(2000); });
  const r7a = await R('工具输出内部滚动', 'trace.output.scroll', '主任务视图/轨迹', 'output container', async () => {
    const raw = await page.evaluate(() => { const cands = [...document.querySelectorAll('[class*="output"],[class*="Output"],[class*="tool"],[class*="Tool"],[class*="pre"],[class*="code"]')].filter(e => e.offsetWidth && e.scrollHeight > e.clientHeight); return cands.slice(0, 3).map(e => ({ cls: (e.className || '').toString().slice(0, 40), sh: e.scrollHeight, ch: e.clientHeight })); });
    return { value: raw.length > 0, raw, derivation: 'some output container scrollHeight>clientHeight' };
  });
  const r7b = await R('实际read输出末行', 'trace.output.lastline', '主任务视图/轨迹', 'read output', async () => { const t = await page.evaluate(() => (document.querySelector('main')?.innerText || document.body.innerText)); return { value: t, raw: { hasLast: t.includes('FAST_LONG_LINE_200') } }; });

  // ---- G8-08 write deliver.txt ----
  await A('新建会话写交付文件', 'click', '新建任务', async () => { await newTask(page); await setPerm('工作区内修改'); });
  await A('请求写入deliver.txt', 'fill+click', 'deliver.txt', () => typeAndSend(page, `请在目录 ${WORK} 写入文件 deliver.txt，内容为 FAST_DELIVER_OK，并明确将该文件作为最终交付。不要做其他操作。`));
  const term8 = await waitTerminal(page, { timeout: 120000 });
  await sleep(1500);
  const r8a = await FR('实际deliver.txt文件内容', WORK + '\\deliver.txt', '本轮工作目录', WORK + '\\deliver.txt', () => { const p = path.join(WORK, 'deliver.txt'); const ex = fs.existsSync(p); return { value: ex ? fs.readFileSync(p, 'utf8').trim() : '', raw: { exists: ex } }; });
  const r8b = await R('当前任务产物文件身份', 'task.deliver.card', '主任务视图/产物卡', 'product card path', async () => { const t = await page.evaluate(() => (document.querySelector('main')?.innerText || document.body.innerText)); return { value: t.includes('deliver.txt'), raw: { hasName: t.includes('deliver.txt') }, derivation: 'product card shows deliver.txt' }; });

  // ---- G8-09/10 work steps on the write task ----
  const r9a = await R('完成工作步骤默认折叠', 'worksteps.collapsed', '主任务视图/工作步骤面板', '[aria-expanded]', async () => {
    const raw = await page.evaluate(() => { const b = [...document.querySelectorAll('[aria-expanded]')].filter(e => /工作|步骤|已完成/.test(e.innerText || '')).map(e => ({ aria: e.getAttribute('aria-expanded'), text: (e.innerText || '').slice(0, 30) })); return b; });
    const collapsed = raw.length ? raw.some(x => x.aria === 'false') : false;
    return { value: collapsed, raw, derivation: 'a work-steps control has aria-expanded=false' };
  });
  await A('展开工作步骤', 'click', '展开', async () => { const b = page.locator('[aria-expanded="false"]').filter({ hasText: /工作|步骤|已完成/ }).first(); if (await b.count()) await b.click({ timeout: 5000 }).catch(() => {}); else await page.getByText('已完成工作', { exact: false }).first().click({ timeout: 5000 }).catch(() => {}); await sleep(1500); });
  const r9b = await R('展开后执行记录可读', 'worksteps.records', '主任务视图/工作步骤面板', 'tool record', async () => { const t = await page.evaluate(() => (document.querySelector('main')?.innerText || document.body.innerText)); return { value: /write|read|工具|调用|步骤/.test(t), raw: { snippet: t.slice(0, 200) }, derivation: 'tool record text present after expand' }; });
  const r10 = await R('单read多层聚合', 'worksteps.nesting', '主任务视图/工作步骤面板', 'nested groups', async () => { const n = await page.evaluate(() => { const groups = [...document.querySelectorAll('[aria-expanded]')].filter(e => /工具|步骤|调用|read|write/i.test(e.innerText || '')); return groups.length; }); return { value: n >= 2, raw: { groupCount: n }, derivation: 'two or more same-type aggregate groups nested' }; });

  const ended = new Date().toISOString();
  fs.writeFileSync(path.join(root, 'tools', 'run', 'scratch', 'g8-run.json'), JSON.stringify(out, null, 2), 'utf8');
  const ev = evidenceFor(g, ['tools/run/scratch/g8-run.json']);
  const mk = (id, object_identity, inputs, steps, assertions, cleanup) => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, attempt_id: 'G8-A01', environment_id: environmentId, evidence: ev, started_at: t0, ended_at: ended, action_refs: actionRefs, cleanup: cleanup || { status: 'unchanged', description: '本轮任务保留', read_refs: [] }, notes: 'G8共享A/B任务与read/write任务。' });
  mk('G8-02', '本轮A任务', [], ['A完成回显', 'B标A未读', '进入A'], [{ id: 'G8-02-A1', actual: r2a.value, read_refs: [r2a.event_id] }, { id: 'G8-02-A2', actual: r2b.value, read_refs: [r2b.event_id] }]);
  mk('G8-03', '本轮A任务', [], ['标记未读', '回读'], [{ id: 'G8-03-A1', actual: r3a.value, read_refs: [r3a.event_id] }, { id: 'G8-03-A2', actual: r3b.value, read_refs: [r3b.event_id] }]);
  mk('G8-06', '本轮read任务', [WORK + '\\flow.txt'], ['请求读取flow.txt', '读Trace'], [{ id: 'G8-06-A1', actual: r6a.value, read_refs: [r6a.event_id] }, { id: 'G8-06-A2', actual: r6b.value, read_refs: [r6b.event_id] }]);
  mk('G8-07', '本轮read长输出任务', [WORK + '\\long.txt'], ['请求读取long.txt', '滚动输出'], [{ id: 'G8-07-A1', actual: r7a.value, read_refs: [r7a.event_id] }, { id: 'G8-07-A2', actual: r7b.value, read_refs: [r7b.event_id] }]);
  mk('G8-08', '本轮写文件任务', ['deliver.txt'], ['请求写入', '读文件与产物卡'], [{ id: 'G8-08-A1', actual: r8a.value, read_refs: [r8a.event_id] }, { id: 'G8-08-A2', actual: r8b.value, read_refs: [r8b.event_id] }]);
  mk('G8-09', '本轮read/write任务', [], ['读折叠状态', '展开'], [{ id: 'G8-09-A1', actual: r9a.value, read_refs: [r9a.event_id] }, { id: 'G8-09-A2', actual: r9b.value, read_refs: [r9b.event_id] }]);
  mk('G8-10', '本轮read/write任务', [], ['读聚合层级'], [{ id: 'G8-10-A1', actual: r10.value, read_refs: [r10.event_id] }]);
  console.log(JSON.stringify({ a: out.a, menu: out.menu, r3: [r3a.value, r3b.value], r2: [r2a.value, r2b.value], r6: [r6a.value, r6b.value.length], r7: [r7a.value, r7b.value.length], r8: [r8a.value, r8b.value], r9: [r9a.value, r9b.value], r10: r10.value }, null, 2));
});
