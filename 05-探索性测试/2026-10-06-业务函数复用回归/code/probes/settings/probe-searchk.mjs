// Probe: Ctrl+K search panel.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  for (let i = 0; i < 2; i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
  await page.keyboard.press('Control+K');
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const inputs = [...document.querySelectorAll('input,textarea')].filter(vis).map(e => ({ type: e.type, ph: e.getAttribute('placeholder'), cls: (e.className||'').toString().slice(0,50) }));
    const dialogs = [...document.querySelectorAll('[role="dialog"],[class*="modal"],[class*="search"],[class*="Search"]')].filter(vis).map(e => ({ cls: (e.className||'').toString().slice(0,50), text: (e.innerText||'').replace(/\s+/g,' ').slice(0,80) }));
    return { inputs, dialogs, focused: document.activeElement ? document.activeElement.tagName + '.' + (document.activeElement.className||'').toString().slice(0,40) : null };
  });
  console.log(JSON.stringify(info, null, 1).slice(0, 1500));
  await page.keyboard.press('Escape').catch(() => {});
} finally { await browser.close(); }
