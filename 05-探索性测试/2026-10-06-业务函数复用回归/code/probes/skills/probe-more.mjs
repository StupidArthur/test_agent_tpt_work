// Probe: explore 更多 menu and 技能/专家 pages.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  await page.locator('button[aria-label="更多"]').first().click();
  await page.waitForTimeout(1200);
  const menu = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return [...document.querySelectorAll('[role="menu"]:not([hidden])')].filter(vis).map(m => (m.innerText || '').trim().slice(0, 500));
  });
  console.log('更多 menu:', JSON.stringify(menu));
  const item = page.getByText('技能', { exact: true }).first();
  console.log('技能 count:', await item.count());
  if (await item.count()) {
    await item.click();
    await page.waitForTimeout(2000);
    const dump = await page.evaluate(() => {
      const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const frames = [...document.querySelectorAll('iframe')].map(f => f.getAttribute('src'));
      const btns = [...document.querySelectorAll('button,[role="button"],[role="tab"]')].filter(vis).map(b => ({ t: (b.innerText || '').trim().slice(0, 30), aria: b.getAttribute('aria-label') }));
      return { frames, btns, body: document.body.innerText.slice(0, 1200) };
    });
    console.log(JSON.stringify(dump, null, 2));
  }
} finally { await browser.close(); }
