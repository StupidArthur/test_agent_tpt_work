// Probe: expert list after copy import.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  await page.locator('button[aria-label="专家"]').first().click();
  await page.waitForTimeout(2000);
  const frame = page.frames().find(f => f.url().includes('supcon-agents'));
  const dump = await frame.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const cards = [...document.querySelectorAll('div[class*="_card_"]')].filter(vis).map(c => (c.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 100));
    return { bodyHead: document.body.innerText.slice(0, 300), cards };
  });
  console.log(JSON.stringify(dump, null, 2));
  console.log('--- disk agents dir ---');
} finally { await browser.close(); }
