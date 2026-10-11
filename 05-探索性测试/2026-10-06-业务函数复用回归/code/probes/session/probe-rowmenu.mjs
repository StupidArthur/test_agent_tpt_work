// Probe: session row menu (mark unread) and unread badge.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const row = page.locator('[data-row-key^="session:"]').first();
  await row.scrollIntoViewIfNeeded();
  await row.hover();
  await page.waitForTimeout(800);
  const rowInfo = await row.evaluate((r) => ({ text: (r.innerText || '').replace(/\s+/g, ' ').slice(0, 80), buttons: [...r.querySelectorAll('button')].map((b) => ({ aria: b.getAttribute('aria-label'), t: (b.innerText || '').trim().slice(0, 12) })) }));
  console.log('row', JSON.stringify(rowInfo));
  const menuBtn = row.locator('button[aria-label*="更多"], button[aria-label*="菜单"], button[aria-label*="操作"]').first();
  if (await menuBtn.count()) { await menuBtn.click(); await page.waitForTimeout(1000); }
  const menu = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return [...document.querySelectorAll('[role="menu"]:not([hidden])')].filter(vis).map(m => (m.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200));
  });
  console.log('menu', JSON.stringify(menu));
  await page.keyboard.press('Escape');
} finally { await browser.close(); }
