// Probe: read the skill detail page (full-page view inside skills iframe).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const frame = page.frames().find(f => f.url().includes('supcon-skills'));
  const dump = await frame.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const candidates = [...document.querySelectorAll('pre,code,[class*="markdown"],[class*="content"],[class*="editor"],[class*="preview"]')].filter(vis).map(e => ({ tag: e.tagName, cls: (e.className||'').toString().slice(0,60), text: (e.innerText||'').slice(0,200) })).slice(0, 25);
    return { body: document.body.innerText.slice(0, 2000), candidates };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
