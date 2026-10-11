// 软件操作支撑层：会话页面控件定位与交互原语。
import { connect } from './session.mjs';

export const SEL = {
  newTask: 'button[aria-label="新建任务"]',
  project: 'button[aria-label="选择项目"]',
  model: 'button[aria-label^="选择模型"]',
  access: 'button[aria-label^="访问模式"]',
  composer: 'div[contenteditable="true"][aria-label*="/ 调用指令"]',
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
