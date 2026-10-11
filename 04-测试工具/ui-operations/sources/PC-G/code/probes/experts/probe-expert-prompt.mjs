// Probe: expert prompt container class.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const frame = page.frames().find(f => f.url().includes('supcon-agents'));
  const dump = await frame.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    let best = null;
    for (const el of document.querySelectorAll('*')) {
      if (!vis(el)) continue;
      const t = (el.innerText || '');
      if (t.includes('FAST_EXPERT_EXEC_OK')) { if (!best || t.length < best.len) best = { el, len: t.length }; }
    }
    if (!best) return { none: true };
    const chain = [];
    let cur = best.el;
    for (let i = 0; i < 5 && cur; i++) { const at = {}; for (const a of cur.attributes) at[a.name] = String(a.value).slice(0, 90); chain.push({ tag: cur.tagName, attrs: at, len: (cur.innerText||'').length }); cur = cur.parentElement; }
    return { text: best.el.innerText.slice(0, 250), chain };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
