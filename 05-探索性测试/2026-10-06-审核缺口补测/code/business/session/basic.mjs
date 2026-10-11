// G1 基础对话 shared scenario: existing-project selection, plain-text session, code-block session.
// Records real actions/reads through ctx.recorder; returns observations only (no pass/fail verdicts).
import { withApp, sleep, newTask, selectProject, typeAndSend, waitTerminal, sessionId, lastAssistantText, runningCount, SELECTORS } from '../../automation/tpt.mjs';

const FILE_PRODUCT_SELECTOR = '[class*="fileLink"],[data-slot*="file"],[class*="fileCard"],[class*="FileCard"],[class*="artifact"],[class*="deliver"]';

async function readFileProductCount(page, chatCount) {
  return page.evaluate((sel) => {
    const chat = document.querySelector('[data-conversation-region="chat"]');
    if (!chat) return null;
    const cards = [...chat.querySelectorAll(sel)].filter((e) => e.offsetWidth || e.offsetHeight);
    return { count: cards.length, cls: cards.map((e) => (e.className || '').toString().slice(0, 60)) };
  }, FILE_PRODUCT_SELECTOR);
}

export async function sessionBasic(ctx, args) {
  const text = args.text ?? '只回答：FAST_CHAT_OK';
  const codeRequest = args.codeRequest ?? '用一个代码块输出字母A和B，每行一个，不要其他内容。';
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    const observations = {};

    // ---- G1-03 select existing project for the current task ----
    await newTask(page);
    const ws0 = page.locator(SELECTORS.workspace).first();
    const beforeProject = (await ws0.innerText().catch(() => '')).trim();
    const menuItems = [];
    const selectAction = await recorder.action('当前任务选择项目', 'click', '点击项目选择器并从已有项目列表选择', async () => {
      await ws0.click({ timeout: 8000 });
      await sleep(600);
      const items = page.locator('[role="menuitem"]');
      const n = await items.count();
      for (let i = 0; i < n; i++) menuItems.push((await items.nth(i).innerText()).replace(/\s+/g, ' ').trim());
      const target = page.getByRole('menuitem', { name: /^tpt-workspace/ }).first();
      if (!(await target.count())) throw new Error('existing project menuitem not found');
      await target.click({ timeout: 8000 });
      await sleep(800);
    });
    const readProject = await recorder.read('当前任务项目', 'current-task-project', {
      channel: 'dom', scope: '主任务视图/composer项目控件', locator: SELECTORS.workspace,
    }, async () => {
      const after = (await page.locator(SELECTORS.workspace).first().innerText()).trim();
      const raw = { before: beforeProject, after, menu_items: menuItems };
      return { value: after, raw, derivation: 'read project selector text after choosing from existing project menu' };
    });
    observations.G1_03 = { action: selectAction.event_id, read: readProject.event_id, value: readProject.value };

    // ---- G1-06 plain-text session, no file product ----
    const sendTextAction = await recorder.action('发送纯文本回显请求', 'fill+click', text, async () => {
      await typeAndSend(page, text);
    });
    const term = await waitTerminal(page, { timeout: 180000 });
    await sleep(1500);
    const sidText = await sessionId(page);
    const readReply = await recorder.read('本轮纯文本助手气泡', sidText, {
      channel: 'dom', scope: '主任务视图/对话区/助手正文', locator: '[class*="hWmORq_body"]',
    }, async () => {
      const value = (await lastAssistantText(page)).trim();
      return { value, raw: { session: sidText, terminal_ok: term.ok, ms: term.ms } };
    });
    const readChatRegion = await recorder.read('纯文本会话产物区存在', sidText, {
      channel: 'dom', scope: '目标会话产物区/对话内容区', locator: SELECTORS.chat,
    }, async () => {
      const exists = await page.locator(SELECTORS.chat).count();
      const raw = { chat_region_count: exists };
      return { value: exists === 1, raw, derivation: 'chat region count === 1' };
    });
    const readProducts = await recorder.read('纯文本会话产物区', sidText, {
      channel: 'dom', scope: '目标会话chat区/文件产物元素', locator: FILE_PRODUCT_SELECTOR,
    }, async () => {
      const r = await readFileProductCount(page);
      return { value: r ? r.count : null, raw: r, reason: r ? undefined : 'chat region absent' };
    });
    observations.G1_06 = {
      action: sendTextAction.event_id, reply_read: readReply.event_id, region_read: readChatRegion.event_id,
      product_read: readProducts.event_id, product_count: readProducts.value, session: sidText,
    };

    // ---- G1-08 code-block session, no file product ----
    await newTask(page);
    await selectProject(page).catch(() => {});
    await recorder.action('新建代码块会话', 'click', '新建任务并选择已有项目', async () => { await sleep(500); });
    const sendCodeAction = await recorder.action('发送代码块请求', 'fill+click', codeRequest, async () => {
      await typeAndSend(page, codeRequest);
    });
    const term2 = await waitTerminal(page, { timeout: 180000, expect: null });
    await sleep(1500);
    const sidCode = await sessionId(page);
    const readCode = await recorder.read('本轮代码块', sidCode, {
      channel: 'dom', scope: '主任务视图/对话区/代码块', locator: '[class*="hWmORq_body"] pre code, [class*="hWmORq_body"] code, [class*="hWmORq_body"] pre',
    }, async () => {
      const body = page.locator('[class*="hWmORq_body"]').last();
      const codeEl = body.locator('pre code, code, pre').first();
      let v = '';
      if (await codeEl.count()) v = (await codeEl.textContent()) ?? '';
      const normalized = v.replace(/\r\n/g, '\n').replace(/\n+$/, '');
      return { value: normalized, raw: { rawText: v, session: sidCode, terminal_ok: term2.ok } };
    });
    const readCodeProducts = await recorder.read('代码块会话产物区', sidCode, {
      channel: 'dom', scope: '目标会话chat区/文件产物元素', locator: FILE_PRODUCT_SELECTOR,
    }, async () => {
      const r = await readFileProductCount(page);
      return { value: r ? r.count : null, raw: r, reason: r ? undefined : 'chat region absent' };
    });
    observations.G1_08 = { action: sendCodeAction.event_id, code_read: readCode.event_id, product_read: readCodeProducts.event_id, product_count: readCodeProducts.value, session: sidCode };

    observations.session_text = sidText;
    observations.session_code = sidCode;
    return observations;
  });
}
