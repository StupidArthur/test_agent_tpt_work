// Probe: detect any open dialog/mask that could intercept clicks.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const info = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(vis).map(d => ({ cls: (d.className || '').toString().split(' ')[0], shortcut: d.getAttribute('data-shortcut-modal'), text: (d.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60) }));
    const masks = [...document.querySelectorAll('[class*="mask"],[class*="overlay"]')].filter(vis).map(m => (m.className || '').toString().split(' ')[0]);
    const session = document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') || null;
    const composerVisible = !!document.querySelector('div[contenteditable="true"][aria-label*="/ 调用指令"]');
    return { dialogs, masks, session, composerVisible };
  });
  console.log(JSON.stringify(info, null, 2));
} finally { await browser.close(); }
