// Probe: list all dialogs and locate settings panel.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const dump = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].map(d => ({ cls: (d.className || '').toString().slice(0, 60), vis: vis(d), len: (d.innerText || '').length, text: (d.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120) }));
    // also look for a container holding '常规' + '外观'
    let panel = null;
    for (const el of document.querySelectorAll('*')) {
      if (!vis(el)) continue;
      const t = (el.innerText || '');
      if (t.includes('外观') && t.includes('语言') && t.includes('字号大小')) { if (!panel || t.length < panel.len) panel = { el, len: t.length }; }
    }
    let chain = null;
    if (panel) { chain = []; let cur = panel.el; for (let i = 0; i < 6 && cur; i++) { const at = {}; for (const a of cur.attributes) at[a.name] = String(a.value).slice(0, 60); chain.push({ tag: cur.tagName, attrs: at, len: (cur.innerText || '').length }); cur = cur.parentElement; } }
    return { dialogs, panelChain: chain };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
