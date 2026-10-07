// Probe: expert page structure and import dialog.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  await page.locator('button[aria-label="专家"]').first().click();
  await page.waitForTimeout(2000);
  const frames = page.frames().map(f => f.url());
  const frame = page.frames().find(f => /supcon-agents|supcon-expert/.test(f.url()));
  console.log('frames:', JSON.stringify(frames));
  if (!frame) { console.log('no expert frame'); }
  else {
    const btns = await frame.evaluate(() => {
      const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      return [...document.querySelectorAll('button,[role="button"],[role="tab"],input')].filter(vis).map(b => ({ tag: b.tagName, t: (b.innerText || b.value || '').trim().slice(0, 30), aria: b.getAttribute('aria-label'), ph: b.getAttribute('placeholder'), type: b.getAttribute('type'), dir: b.getAttribute('webkitdirectory') }));
    });
    console.log(JSON.stringify({ url: frame.url(), btns, inputs: await frame.evaluate(() => document.querySelectorAll('input[type=file]').length) }, null, 2));
  }
} finally { await browser.close(); }
