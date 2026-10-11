// Probe: locate a real session identifier in DOM.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const res = await page.evaluate(() => {
    const out = { attrHits: [], storage: {} };
    const re = /(t-\d{8}-\d{6}-|session|conversation|tab-|thread)/i;
    for (const el of document.querySelectorAll('*')) {
      for (const a of el.attributes || []) {
        if (a.name === 'class' || a.name === 'style') continue;
        if (re.test(a.name) || re.test(a.value)) out.attrHits.push({ tag: el.tagName, name: a.name, value: String(a.value).slice(0, 120) });
      }
    }
    out.attrHits = out.attrHits.slice(0, 60);
    for (const store of ['localStorage', 'sessionStorage']) {
      const s = window[store]; const keys = [];
      for (let i = 0; i < s.length; i++) keys.push(s.key(i));
      out.storage[store] = keys.slice(0, 30);
    }
    return out;
  });
  console.log(JSON.stringify(res, null, 2));
} finally { await browser.close(); }
