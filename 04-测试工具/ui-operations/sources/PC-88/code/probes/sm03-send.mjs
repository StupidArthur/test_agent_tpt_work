// Step: SM-03 send chat and read assistant reply (inspect DOM).
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const EXPECT = 'SMOKE_CHAT_pc88-20261006-smoke01_OK';
try {
  for (let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200); }
  const tb = page.getByRole('textbox');
  await tb.first().click();
  await page.keyboard.insertText(`只回复：${EXPECT}。不要使用工具。`);
  await page.waitForTimeout(400);
  console.log('COMPOSER_BEFORE_SEND', JSON.stringify((await page.locator('body').innerText()).split('\n').filter(Boolean).slice(-6)));
  await page.getByRole('button', { name: '发送消息' }).click();
  const deadline = Date.now() + 95000;
  let found = false, polls = 0;
  while (Date.now() < deadline) {
    await page.waitForTimeout(2000); polls++;
    const body = await page.locator('body').innerText();
    if (body.includes(EXPECT)) { found = true; break; }
  }
  console.log('FOUND_EXPECT', found, 'polls', polls);
  await page.waitForTimeout(1000);
  const body = await page.locator('body').innerText();
  console.log('BODY_TAIL', JSON.stringify(body.split('\n').filter(Boolean).slice(-25)));
  const stop = await page.getByRole('button', { name: /停止/ }).count();
  console.log('STOP_BUTTONS', stop);
  // conversation DOM structure
  const struct = await page.evaluate(() => {
    const t = document.body.innerText;
    const i = t.indexOf('SMOKE_CHAT');
    return { url: location.href, hasChat: i>=0, snippet: i>=0 ? t.slice(Math.max(0,i-120), i+80) : null };
  });
  console.log('STRUCT', JSON.stringify(struct));
} finally { await browser.close(); }
