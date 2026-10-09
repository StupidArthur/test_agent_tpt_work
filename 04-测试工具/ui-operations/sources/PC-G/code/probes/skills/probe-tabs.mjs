// Probe: skills page tabs.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  for (let i = 0; i < 2; i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('button[aria-label="技能"]').first().click();
  await page.waitForTimeout(2000);
  const frames = page.frames().map((f) => f.url()).filter((u) => u && !u.startsWith('devtools'));
  console.log('FRAMES', JSON.stringify(frames));
  const info = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const tabs = [...document.querySelectorAll('[role="tab"],button,[class*="tab"],[class*="Tab"]')].filter(vis).map((e) => (e.innerText || '').trim()).filter((t) => t && t.length < 16);
    return [...new Set(tabs)].slice(0, 20);
  });
  console.log('TABS', JSON.stringify(info));
} finally { await browser.close(); }
