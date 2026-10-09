// Probe: inspect overlay-like elements (uV2eYG_overlayAnchor, pI_x6G_overlayLayer, masks).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const info = await page.evaluate(() => {
    const out = [];
    for (const sel of ['[class*="overlayAnchor"]', '[class*="overlayLayer"]', '[class*="mask"]', '[class*="overlay"]']) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        out.push({ sel, cls: (el.className || '').toString(), tag: el.tagName, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, pos: cs.position, opacity: cs.opacity, bg: cs.backgroundColor, pointerEvents: cs.pointerEvents, zIndex: cs.zIndex, display: cs.display, ariaHidden: el.getAttribute('aria-hidden'), text: (el.innerText || '').trim().slice(0, 30) });
      }
    }
    // what receives a click at center of the largest such overlay
    const centerProbe = (el) => { const r = el.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e ? (e.tagName + '.' + (e.className || '').toString().split(' ')[0]) : null; };
    const layers = [...document.querySelectorAll('[class*="overlayAnchor"], [class*="overlayLayer"]')];
    const probes = layers.map((el) => ({ cls: (el.className || '').toString().split(' ')[0], centerHit: centerProbe(el) }));
    return { out, probes };
  });
  console.log(JSON.stringify(info, null, 2));
} finally { await browser.close(); }
