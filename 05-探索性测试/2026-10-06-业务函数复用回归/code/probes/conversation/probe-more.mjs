// Probe: 更多 menu items.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  await page.keyboard.press('Escape').catch(() => {});
  await page.locator('button', { hasText: '更多' }).first().click({ force: true });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const pops = [...document.querySelectorAll('[role="menu"],[class*="menu"],[class*="Menu"],[class*="popover"],[class*="dropdown"]')].filter(vis);
    const items = pops.flatMap((el) => [...el.querySelectorAll('button,[role="menuitem"],li,a,div')]).filter(vis).map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter((t) => t && t.length < 20);
    return [...new Set(items)].slice(0, 20);
  });
  console.log(JSON.stringify(info));
} finally { await browser.close(); }
