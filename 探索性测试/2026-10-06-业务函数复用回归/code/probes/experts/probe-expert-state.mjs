// Probe: expert page state after import attempt.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const frame = page.frames().find(f => f.url().includes('supcon-agents'));
  const dump = await frame.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const dlg = document.querySelector('[role="dialog"]');
    const cards = [...document.querySelectorAll('[data-slot="card"]')].filter(vis).map(c => (c.innerText || '').trim().slice(0, 80));
    return { body: document.body.innerText.slice(0, 1200), dialog: dlg ? dlg.innerText.slice(0, 600) : null, cards, cardCount: document.querySelectorAll('[data-slot="card"]').length };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
