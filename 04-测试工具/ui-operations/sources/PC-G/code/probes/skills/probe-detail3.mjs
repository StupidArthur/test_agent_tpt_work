// Probe: attributes of the skill detail preview container.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const frame = page.frames().find(f => f.url().includes('supcon-skills'));
  const dump = await frame.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const out = [];
    for (const el of document.querySelectorAll('[class*="dir-preview"],[class*="dir-tree"],[class*="page"]')) {
      if (!vis(el)) continue;
      const at = {}; for (const a of el.attributes) at[a.name] = String(a.value).slice(0, 80);
      const r = el.getBoundingClientRect();
      out.push({ tag: el.tagName, attrs: at, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, text: (el.innerText || '').trim().slice(0, 80) });
    }
    return out.slice(0, 12);
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
