// Probe: discover shell/composer/project-menu structure for business functions.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');

const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
try {
  const pages = browser.contexts().flatMap(c => c.pages());
  const page = pages.find(p => p.url().startsWith('dsh-app://'));
  if (!page) throw new Error('no app page');
  const info = await page.evaluate(() => {
    const out = { buttons: [], contenteditables: [], frames: [], testids: [] };
    const vis = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    for (const b of document.querySelectorAll('button,[role="button"],[role="menuitem"],[role="tab"]')) {
      if (!vis(b)) continue;
      out.buttons.push({ tag: b.tagName, text: (b.innerText || '').trim().slice(0, 40), aria: b.getAttribute('aria-label'), cls: (b.className || '').toString().slice(0, 60) });
    }
    for (const e of document.querySelectorAll('[contenteditable="true"],textarea,input')) {
      if (!vis(e)) continue;
      out.contenteditables.push({ tag: e.tagName, ph: e.getAttribute('placeholder'), aria: e.getAttribute('aria-label'), cls: (e.className || '').toString().slice(0, 60) });
    }
    for (const f of document.querySelectorAll('iframe')) out.frames.push({ src: f.getAttribute('src'), title: f.getAttribute('title') });
    for (const t of document.querySelectorAll('[data-testid]')) out.testids.push(t.getAttribute('data-testid'));
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
} finally { await browser.close(); }
