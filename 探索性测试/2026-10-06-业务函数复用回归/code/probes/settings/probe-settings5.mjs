// Probe: dump settings dialog element tree.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const dump = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return { noDialog: true };
    const rows = [...dlg.querySelectorAll('*')].filter(vis).filter(e => e.children.length === 0 && (e.innerText || '').trim()).slice(0, 80).map(e => {
      const chain = [];
      let cur = e; for (let i = 0; i < 4 && cur && cur !== dlg.parentElement; i++) { chain.push(cur.tagName + '.' + ((cur.className || '').toString().split(' ')[0])); cur = cur.parentElement; }
      return { text: (e.innerText || '').trim().slice(0, 30), chain };
    });
    return { dialogClass: (dlg.className || '').toString().slice(0, 80), rows };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
