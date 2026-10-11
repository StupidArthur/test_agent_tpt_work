// Probe: 自动化任务 recommended cases.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  await page.keyboard.press('Escape').catch(() => {});
  const btn = page.locator('button', { hasText: '自动化任务' }).first();
  await btn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const cards = [...document.querySelectorAll('[class*="card"],[class*="Card"],li,button')].filter(vis).map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter((t) => t && t.length > 4 && t.length < 80);
    return [...new Set(cards)].slice(0, 20);
  });
  console.log(JSON.stringify(info, null, 1).slice(0, 1200));
} finally { await browser.close(); }
