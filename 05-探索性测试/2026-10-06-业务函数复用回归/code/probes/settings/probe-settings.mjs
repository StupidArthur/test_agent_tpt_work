// Probe: open settings and inspect structure.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
  // avatar menu
  const avatar = page.locator('button', { hasText: 'Arthur' }).first();
  if (await avatar.count()) { await avatar.click(); await page.waitForTimeout(1000); }
  const menu = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return [...document.querySelectorAll('[role="menu"]:not([hidden])')].filter(vis).map(m => (m.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200));
  });
  console.log('menu:', JSON.stringify(menu));
  const set = page.getByText('设置', { exact: true }).first();
  if (await set.count()) { await set.click(); await page.waitForTimeout(1500); }
  const dump = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(vis).map(d => (d.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 800));
    return { dialogs, body: document.body.innerText.slice(0, 400) };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
