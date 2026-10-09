// Probe: expand trace tool row to read full output.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const row = page.locator('tr[data-kind="tool"]').last();
  console.log('row count', await page.locator('tr[data-kind="tool"]').count());
  // list buttons within the row
  const btns = await row.evaluate((r) => [...r.querySelectorAll('button')].map(b => ({ aria: b.getAttribute('aria-label'), text: (b.innerText || '').trim().slice(0, 20) })));
  console.log('row buttons', JSON.stringify(btns));
  await row.click();
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const panels = [...document.querySelectorAll('[role="dialog"],[class*="drawer"],[class*="detail"],[class*="preview"]')].filter(vis).map(d => (d.innerText || '').slice(0, 200));
    const bodyTail = document.body.innerText.slice(-400);
    const has200 = document.body.innerText.includes('FAST_LONG_LINE_200');
    return { panels, bodyTail, has200 };
  });
  console.log(JSON.stringify(after, null, 2));
} finally { await browser.close(); }
