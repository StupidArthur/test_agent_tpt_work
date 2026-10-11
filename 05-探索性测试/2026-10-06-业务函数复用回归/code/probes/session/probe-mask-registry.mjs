// Probe: registry of all mask/overlay elements and their visibility.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const list = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const out = [];
    for (const el of document.querySelectorAll('[class*="mask"],[class*="Mask"],[class*="backdrop"]')) {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      out.push({ cls: (el.className || '').toString(), visible: vis(el), w: Math.round(r.width), h: Math.round(r.height), opacity: cs.opacity, bg: cs.backgroundColor, pe: cs.pointerEvents, z: cs.zIndex, display: cs.display });
    }
    return out;
  });
  console.log(JSON.stringify(list, null, 2));
} finally { await browser.close(); }
