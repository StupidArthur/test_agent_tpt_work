// Probe: 新建技能 / 创建专家 entry.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  for (let i = 0; i < 2; i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('button[aria-label="技能"]').first().click();
  await page.waitForTimeout(3000);
  let f = page.frames().find(fr => fr.url().includes('supcon-skills'));
  if (!f) { await page.waitForTimeout(2500); f = page.frames().find(fr => fr.url().includes('supcon-skills')); }
  console.log('frames', page.frames().map((x) => x.url()).filter((u) => u.includes('supcon')));
  await f.getByText('新建技能', { exact: true }).first().click();
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const c = document.querySelector('div[contenteditable="true"]');
    const sid = (document.querySelector('[data-conversation-session]') || {}).getAttribute ? document.querySelector('[data-conversation-session]').getAttribute('data-conversation-session') : null;
    return { session: sid, composer: c ? c.innerText : null, body: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300) };
  });
  console.log(JSON.stringify(info).slice(0, 900));
} finally { await browser.close(); }
