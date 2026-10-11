// Probe: expert card element structure.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const frame = page.frames().find(f => f.url().includes('supcon-agents'));
  const dump = await frame.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    let target = null;
    for (const el of document.querySelectorAll('*')) {
      if (!vis(el)) continue;
      const t = (el.innerText || '').trim();
      if (t.startsWith('本轮快速回归专家') && t.includes('来源') && t.length < 300) { target = el; break; }
    }
    if (!target) return { none: true };
    const chain = [];
    let cur = target;
    for (let i = 0; i < 7 && cur; i++) {
      const at = {}; for (const a of cur.attributes) at[a.name] = String(a.value).slice(0, 90);
      chain.push({ tag: cur.tagName, attrs: at, len: (cur.innerText || '').length });
      cur = cur.parentElement;
    }
    return { chain, html: target.outerHTML.slice(0, 1200) };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
