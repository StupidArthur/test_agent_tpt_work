// Probe: scan for visible semi-transparent large overlays + screenshot.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const scan = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      if (!vis(el)) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      const bg = cs.backgroundColor;
      const m = /rgba?\(([^)]+)\)/.exec(bg);
      let alpha = 1;
      if (m) { const parts = m[1].split(',').map((s) => parseFloat(s)); if (parts.length === 4) alpha = parts[3]; }
      if (area > 200000 && alpha > 0 && alpha < 1) {
        out.push({ cls: (el.className || '').toString().split(' ').slice(0, 2).join(' '), tag: el.tagName, area: Math.round(area), bg, alpha, z: cs.zIndex, pe: cs.pointerEvents, pos: cs.position });
      }
    }
    return out.slice(0, 25);
  });
  console.log(JSON.stringify(scan, null, 2));
  await page.screenshot({ path: '证据/overlay-state.png' });
  console.log('screenshot saved: 证据/overlay-state.png');
} finally { await browser.close(); }
