// Probe: locate the file/artifact card element and its resource path attribute.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const info = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const hits = [];
    for (const el of document.querySelectorAll('*')) {
      if (!vis(el)) continue;
      const t = (el.innerText || '').trim();
      if (t && t.length < 60 && /deliver\.txt/.test(t)) {
        const chain = [];
        let cur = el;
        for (let i = 0; i < 6 && cur; i++) {
          const attrs = {};
          for (const a of cur.attributes || []) attrs[a.name] = String(a.value).slice(0, 100);
          chain.push({ tag: cur.tagName, attrs });
          cur = cur.parentElement;
        }
        hits.push({ text: t, chain });
      }
    }
    return hits.slice(0, 4);
  });
  console.log(JSON.stringify(info, null, 2));
} finally { await browser.close(); }
