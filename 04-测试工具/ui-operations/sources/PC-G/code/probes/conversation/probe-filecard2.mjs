// Probe: dump the changed-file card HTML and any resource path.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const info = await page.evaluate(() => {
    const card = document.querySelector('[data-changed-files="true"]');
    if (!card) return { none: true };
    const attrs = {}; for (const a of card.attributes) attrs[a.name] = a.value;
    const descendants = [...card.querySelectorAll('*')].slice(0, 25).map(e => {
      const at = {}; for (const a of e.attributes) at[a.name] = String(a.value).slice(0, 120);
      return { tag: e.tagName, text: (e.innerText || '').trim().slice(0, 60), attrs: at };
    });
    return { attrs, html: card.outerHTML.slice(0, 1500), descendants };
  });
  console.log(JSON.stringify(info, null, 2));
} finally { await browser.close(); }
