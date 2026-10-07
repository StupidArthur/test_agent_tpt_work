// automation/conversation.mjs — composer, project, model, chat send/read (PC-88 smoke)
export async function readComposerState(page) {
  const tb = page.getByRole('textbox').first();
  const editorVisible = await tb.count() ? await tb.isVisible() : false;
  const editorEditable = await tb.count() ? await tb.isEditable() : false;

  const proj = page.locator('button[aria-label^="在"]').first();
  let projectLabel = null, project = null;
  if (await proj.count()) {
    projectLabel = await proj.getAttribute('aria-label');
    const m = projectLabel && projectLabel.match(/^在“(.+)”中新建会话$/);
    project = m ? m[1] : null;
  }
  const modelBtn = page.getByRole('button', { name: /选择模型/ }).first();
  let modelLabel = null, modelTitle = null;
  if (await modelBtn.count()) { modelLabel = await modelBtn.getAttribute('aria-label'); modelTitle = await modelBtn.getAttribute('title'); }
  const refs = await page.evaluate(() => {
    const scopes = [...document.querySelectorAll('[class*=composer i],[class*=Composer]')];
    const chips = [...document.querySelectorAll('[class*=chip i],[data-ref],[aria-label*="移除"]')]
      .filter(e => e.getClientRects().length).map(e => (e.innerText||e.getAttribute('aria-label')||'').trim()).filter(Boolean);
    return chips;
  });
  return { editorVisible, editorEditable, projectLabel, project, modelLabel, modelTitle, refs };
}

export async function selectProject(page, name) {
  await page.getByRole('button', { name: '选择项目' }).click();
  await page.waitForTimeout(500);
  await page.getByText(name, { exact: true }).first().click();
  await page.waitForTimeout(700);
}

export async function setReasoning(page, level) {
  await page.getByRole('button', { name: /选择模型/ }).click();
  await page.waitForTimeout(500);
  await page.getByText('推理等级', { exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByRole('menuitemradio', { name: level }).click();
  await page.waitForTimeout(500);
}

export async function typeDraft(page, text) {
  const tb = page.getByRole('textbox').first();
  await tb.click();
  await page.keyboard.insertText(text);
  await page.waitForTimeout(300);
}

export async function send(page) {
  await page.getByRole('button', { name: '发送消息' }).click();
}

export async function waitForIdle(page, timeoutMs = 95000) {
  const deadline = Date.now() + timeoutMs;
  let last = '';
  while (Date.now() < deadline) {
    await page.waitForTimeout(1500);
    const stop = await page.getByRole('button', { name: /停止/ }).count();
    const body = await page.locator('body').innerText();
    last = body;
    const running = /探索中|思考中|生成中|进行中|执行中/.test(body);
    if (!stop && !running) return { idle: true, elapsedPoll: true };
  }
  return { idle: false, last };
}

export async function readAssistantMessages(page) {
  return await page.evaluate(() => {
    const items = [...document.querySelectorAll('[class*=flowItem]')].filter(e => e.getClientRects().length);
    const out = [];
    for (const it of items) {
      const md = it.querySelector('[class*=markdown]');
      if (md) out.push(md.innerText);
    }
    return out;
  });
}

export async function isCompleted(page) {
  const body = await page.locator('body').innerText();
  return /已完成工作/.test(body);
}
