// 软件操作支撑层：会话页面控件定位与交互原语。
import { connect } from './session.mjs';

export const SEL = {
  newTask: 'button[aria-label="新建任务"]',
  project: 'button[class*="_workspace"][aria-haspopup="menu"]:visible',
  model: 'button[aria-label^="选择模型"]',
  access: 'button[aria-label^="访问模式"]',
  composer: 'div[contenteditable="true"]:is([aria-label*="/ 调用指令"],[aria-label*="/ 调用专家或技能"]):visible',
  send: 'button[aria-label="发送消息"]',
  addFile: 'button[aria-label="添加文件或调用指令"]',
  assistantBody: '[class*="hWmORq_body"]',
  anyBody: '[class*="_body"]',
  dialog: '[role="dialog"]:visible',
  menu: '[role="menu"]:visible',
};

export async function withPage(ctx, fn) {
  const conn = await connect(ctx);
  try {
    return await fn(conn.page, conn);
  } finally {
    await conn.close();
  }
}

export function runningIndicatorCount(page) {
  return page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    let n = 0;
    for (const el of document.querySelectorAll('button,div,span')) {
      if (!vis(el)) continue;
      const t = (el.innerText || '').trim();
      if (t === '进行中' || t === '探索中...') n += 1;
    }
    return n;
  });
}
export async function appendDraftText(page,text){
 const lines=text.replace(/\r\n/g,'\n').split('\n');
 for(let i=0;i<lines.length;i++){if(i)await page.keyboard.press('Shift+Enter');await page.keyboard.insertText(lines[i]);}
}
export async function ensureConversationView(page){
 const tab=page.getByText('对话',{exact:true});
 if(await tab.count()===1&&await tab.isVisible())await tab.click();
}

export async function waitTerminal(page, { timeoutMs = 90000, minBubbles = 1 } = {}) {
  const start = Date.now();
  // 等待运行指示归零，且助手气泡数达到本次新增下限。
  await page.waitForFunction((min) => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    let running = 0;
    for (const el of document.querySelectorAll('button,div,span')) {
      if (!vis(el)) continue;
      const t = (el.innerText || '').trim();
      if (t === '进行中' || t === '探索中...') running += 1;
    }
    const bubbles = [...document.querySelectorAll('[class*="hWmORq_body"]')].filter((e) => vis(e) && (e.innerText || '').trim());
    return running === 0 && bubbles.length >= min;
  }, minBubbles, { timeout: timeoutMs });
  return { waited_ms: Date.now() - start };
}

// Independent composer operations; preserve smoke API behavior.
export async function readComposerState(page) {
  const tb = page.locator(SEL.composer).first();
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
    const scope=document.querySelector('div[contenteditable="true"][aria-label*="/ 调用指令"]');if(!scope)throw Error('Composer not found');
    const chips = [...scope.querySelectorAll('[class*=chip i],[data-ref],[aria-label*="移除"]')]
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
  const tb = page.locator(SEL.composer).first();
  await tb.click();
  await page.keyboard.insertText(text);
  await page.waitForTimeout(300);
}

export async function send(page) {
  await page.getByRole('button', { name: '发送消息' }).click();
}

export async function waitForIdle(page, timeoutMs=95000){
 const start=Date.now();while(Date.now()-start<timeoutMs){
  const n=await runningIndicatorCount(page);const stop=await page.getByRole('button',{name:/停止/}).count();
  const replies=await page.locator(SEL.assistantBody).allInnerTexts();
  if(n===0&&stop===0&&replies.some(t=>t.trim()))return {idle:true,replies};
  await page.waitForTimeout(500);
 }return {idle:false,timed_out:true};
}
export async function readAssistantMessages(page){return page.locator(SEL.assistantBody).allInnerTexts();}
export async function isCompleted(page){const running=await runningIndicatorCount(page);const replies=await readAssistantMessages(page);return {running,replies,completed:running===0&&replies.some(t=>t.trim())};}
