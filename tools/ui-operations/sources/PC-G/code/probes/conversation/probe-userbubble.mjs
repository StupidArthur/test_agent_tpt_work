// Probe: identify the user message bubble class.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const res = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const out = [];
    for (const el of document.querySelectorAll('[class*="_body"]')) {
      if (!vis(el)) continue;
      out.push({ cls: (el.className || '').toString(), text: (el.innerText || '').trim().slice(0, 80), len: (el.innerText || '').length });
    }
    return out.slice(-20);
  });
  console.log(JSON.stringify(res, null, 2));
} finally { await browser.close(); }
