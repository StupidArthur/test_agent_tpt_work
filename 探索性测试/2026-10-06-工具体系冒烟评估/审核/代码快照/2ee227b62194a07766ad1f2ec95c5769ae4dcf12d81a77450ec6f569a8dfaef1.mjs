import { SEL, runningIndicatorCount } from '../conversation.mjs';
// automation/conversation.mjs — composer, project, model, chat send/read (PC-88 smoke)
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
