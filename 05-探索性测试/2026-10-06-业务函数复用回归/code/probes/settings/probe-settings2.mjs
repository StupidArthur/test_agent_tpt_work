// Probe: settings general controls.
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
    const els = [...dlg.querySelectorAll('button,[role="radio"],[role="tab"],[role="combobox"],select,[role="switch"],[aria-checked],[aria-pressed],[data-state]')].filter(vis).map(e => ({
      tag: e.tagName, text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 24), role: e.getAttribute('role'), ariaChecked: e.getAttribute('aria-checked'), ariaPressed: e.getAttribute('aria-pressed'), state: e.getAttribute('data-state'), ariaLabel: e.getAttribute('aria-label')
    }));
    return { els: els.slice(0, 60) };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
