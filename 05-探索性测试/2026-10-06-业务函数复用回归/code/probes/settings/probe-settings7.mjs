// Probe: dump settings options subtree.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const dump = await page.evaluate(() => {
    const dlg = document.querySelector('[data-shortcut-modal="settings"]');
    if (!dlg) return { noDialog: true };
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const els = [...dlg.querySelectorAll('button,[role="radio"],[role="radiogroup"],[role="combobox"],[role="switch"],input,[data-state]')].filter(vis).map(e => ({
      tag: e.tagName, cls: (e.className || '').toString().split(' ')[0], text: (e.innerText || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 20), role: e.getAttribute('role'), state: e.getAttribute('data-state'), checked: e.getAttribute('aria-checked'), pressed: e.getAttribute('aria-pressed'), val: e.value
    }));
    return { els: els.slice(0, 90), bodyFont: getComputedStyle(document.body).getPropertyValue('--dsh-content-font-size') };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
