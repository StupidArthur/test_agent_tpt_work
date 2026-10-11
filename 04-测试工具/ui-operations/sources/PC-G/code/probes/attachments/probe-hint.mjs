// Probe: find attachment count hint.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const res = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const hits = [];
    for (const el of document.querySelectorAll('*')) {
      if (!vis(el) || el.children.length > 0) continue;
      const t = (el.innerText || '').trim();
      if (/\b30\b/.test(t) && t.length < 40) hits.push({ t, cls: (el.className || '').toString().split(' ')[0] });
    }
    // also scan title/aria-label
    const attr = [];
    for (const el of document.querySelectorAll('[title],[aria-label]')) {
      const v = (el.getAttribute('title') || '') + '|' + (el.getAttribute('aria-label') || '');
      if (/30/.test(v)) attr.push(v.slice(0, 60));
    }
    return { hits: hits.slice(0, 20), attr: [...new Set(attr)].slice(0, 20) };
  });
  console.log(JSON.stringify(res, null, 2));
} finally { await browser.close(); }
