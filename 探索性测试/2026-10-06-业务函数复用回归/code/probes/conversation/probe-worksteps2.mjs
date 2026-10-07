// Probe: locate 已完成工作 panel and its expand control.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const info = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    let best = null;
    for (const el of document.querySelectorAll('*')) {
      if (!vis(el)) continue;
      const t = (el.innerText || '').trim();
      if (t.startsWith('已完成工作') && t.length < 200) { if (!best || t.length < best.len) best = { el, len: t.length }; }
    }
    if (!best) return { none: true, hasWork: document.body.innerText.includes('已完成工作') };
    const chain = []; let cur = best.el;
    for (let i = 0; i < 6 && cur; i++) { const at = {}; for (const a of cur.attributes) at[a.name] = String(a.value).slice(0, 60); chain.push({ tag: cur.tagName, attrs: at, len: (cur.innerText || '').length }); cur = cur.parentElement; }
    const expanders = [...best.el.querySelectorAll('[aria-expanded]')].map(e => e.getAttribute('aria-expanded'));
    return { text: best.el.innerText.replace(/\s+/g, ' ').slice(0, 120), chain, expanders };
  });
  console.log(JSON.stringify(info, null, 2));
} finally { await browser.close(); }
