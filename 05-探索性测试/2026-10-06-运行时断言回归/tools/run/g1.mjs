import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { withApp, sleep, closeSettings, newTask, typeAndSend, waitTerminal, lastAssistantText, runningCount, productCardCount, root, environmentId, evidenceFor, finalizeCase, SEL } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G1';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, locator, fn) => log.read(target, object_id, { channel: 'dom', scope, locator }, fn);
const dom = (target, scope, locator, fn) => R(target, scope, scope, locator, fn);

await withApp(async (page) => {
  await closeSettings(page);
  await A('新建任务', 'click', '侧栏新建任务', () => newTask(page));

  // G1-01
  const r1 = await dom('新任务编辑器', '主任务视图/composer', SEL.composer, async () => {
    const el = page.locator(SEL.composer).first();
    const raw = { visible: await el.isVisible(), contenteditable: await el.getAttribute('contenteditable'), count: await page.locator(SEL.composer).count() };
    return { value: raw.visible && raw.contenteditable === 'true', raw, derivation: "visible && contenteditable==='true'" };
  });
  // G1-02
  const r2 = await dom('当前任务模型与推理等级', '主任务视图/模型选择器', '[aria-label*="选择模型"]', async () => {
    const btn = page.locator('[aria-label*="选择模型"]').first();
    const text = (await btn.innerText()).trim();
    const parts = text.split(/\s+/);
    return { value: [parts[0], parts[1]], raw: { text }, derivation: 'split chip text into [model, reasoner]' };
  });
  // G1-03
  const r3 = await dom('当前任务项目', '左侧栏项目树/项目标题', '.YDXeBa_projectRow .YDXeBa_title', async () => {
    const name = await page.locator('.YDXeBa_projectRow .YDXeBa_title').first().innerText();
    return { value: name.trim(), raw: { title: name } };
  });

  // G1-04/05/06 : pure text roundtrip
  await A('发送纯文本回显请求', 'fill+click', '只回答：FAST_CHAT_OK', () => typeAndSend(page, '只回答：FAST_CHAT_OK'));
  const term1 = await waitTerminal(page, { expect: 'FAST_CHAT_OK', timeout: 120000 });
  const r4 = await dom('本轮纯文本助手气泡', '主任务视图/对话区', SEL.assistant, async () => ({ value: (await lastAssistantText(page)).trim(), raw: { terminalOk: term1.ok, ms: term1.ms } }));
  const r5 = await dom('上一任务状态', '主任务视图/运行指示', 'text=进行中|探索中...', async () => {
    const c = await runningCount(page);
    return { value: c, raw: { running_indicator_count: c } };
  });
  const r6 = await dom('纯文本会话产物区', '主任务视图/产物卡片', 'file/artifact cards', async () => {
    const c = await productCardCount(page);
    return { value: c, raw: { product_card_count: c } };
  });

  // G1-07/08: new session code block
  await A('新建第二个会话', 'click', '侧栏新建任务', () => newTask(page));
  await A('发送代码块请求', 'fill+click', '用一个代码块输出字母A和B，每行一个，不要其他内容。', () => typeAndSend(page, '用一个代码块输出字母A和B，每行一个，不要其他内容。'));
  const term2 = await waitTerminal(page, { timeout: 120000 });
  const r7 = await dom('本轮代码块', '主任务视图/对话区/代码块', SEL.assistant + ' code', async () => {
    const body = page.locator(SEL.assistant).filter({ hasText: /./ }).last();
    const codeEl = body.locator('pre code, code, pre').first();
    let value = '';
    if (await codeEl.count()) value = (await codeEl.textContent()) ?? '';
    const normalized = value.replace(/\r\n/g, '\n').replace(/\n+$/, '');
    return { value: normalized, raw: { rawText: value, terminalOk: term2.ok, ms: term2.ms } };
  });
  const r8 = await dom('代码块会话产物区', '主任务视图/产物卡片', 'file/artifact cards', async () => {
    const c = await productCardCount(page);
    return { value: c, raw: { product_card_count: c } };
  });

  const ended = new Date().toISOString();
  fs.writeFileSync(path.join(root, 'tools', 'run', 'scratch', 'g1-run.json'), JSON.stringify({ term1, term2, r1: r1.value, r2: r2.value, r3: r3.value, r4: r4.value, r5: r5.value, r6: r6.value, r7: r7.value, r8: r8.value }, null, 2), 'utf8');
  const ev = evidenceFor(g, ['tools/run/scratch/g1-run.json']);
  const common = { attempt_id: 'G1-A01', environment_id: environmentId, evidence: ev, started_at: t0, ended_at: ended, action_refs: actionRefs };
  const cleanup = { status: 'unchanged', description: '本轮新增两个纯文本会话，无设置或资产变更', read_refs: [] };
  const notes = 'G1共享一次纯文本回显与一次代码块会话。';
  const mk = (id, object_identity, inputs, steps, assertions) => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, cleanup, notes, ...common });

  mk('G1-01', '本轮新任务composer', [], ['点击新建任务', '读取composer可见且contenteditable'], [{ id: 'G1-01-A1', actual: r1.value, read_refs: [r1.event_id] }]);
  mk('G1-02', '本轮任务session id', [], ['读取模型选择器chip'], [{ id: 'G1-02-A1', actual: r2.value, read_refs: [r2.event_id] }]);
  mk('G1-03', 'tpt-workspace项目行', [], ['读取侧栏当前项目名'], [{ id: 'G1-03-A1', actual: r3.value, read_refs: [r3.event_id] }]);
  mk('G1-04', '本轮纯文本助手气泡', ['只回答：FAST_CHAT_OK'], ['发送回显请求', '等待终态', '读取助手正文'], [{ id: 'G1-04-A1', actual: r4.value, read_refs: [r4.event_id] }]);
  mk('G1-05', '本轮任务运行指示', [], ['终态后统计运行中指示'], [{ id: 'G1-05-A1', actual: r5.value, read_refs: [r5.event_id] }]);
  mk('G1-06', '本轮纯文本任务产物区', [], ['统计产物卡片'], [{ id: 'G1-06-A1', actual: r6.value, read_refs: [r6.event_id] }]);
  mk('G1-07', '本轮代码块HTML', ['用一个代码块输出字母A和B...'], ['新会话发送代码块请求', '读取code文本并规范化'], [{ id: 'G1-07-A1', actual: r7.value, read_refs: [r7.event_id] }]);
  mk('G1-08', '本轮代码块会话产物区', [], ['统计产物卡片'], [{ id: 'G1-08-A1', actual: r8.value, read_refs: [r8.event_id] }]);

  await page.screenshot({ path: 'tools/run/scratch/g1-end.png' });
  console.log(JSON.stringify({ term1, term2, r4: r4.value, r5: r5.value, r7: r7.value, r8: r8.value }, null, 2));
});
