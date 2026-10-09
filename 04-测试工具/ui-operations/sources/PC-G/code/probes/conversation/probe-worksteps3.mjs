// Probe: turn-process panel expander + tool records.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const info = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const panel = [...document.querySelectorAll('[data-chat-flow-kind="turn-process"]')].filter(vis).pop();
    if (!panel) return { none: true };
    const expanders = [...panel.querySelectorAll('[aria-expanded]')].map(e => ({ aria: e.getAttribute('aria-expanded'), text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40), cls: (e.className || '').toString().split(' ')[0] }));
    const toolRecords = panel.querySelectorAll('[data-chat-flow-kind="tool"], [data-tool-call], [class*="tool"]').length;
    return { text: panel.innerText.replace(/\s+/g, ' ').slice(0, 200), expanders, toolRecords };
  });
  console.log(JSON.stringify(info, null, 2));
} finally { await browser.close(); }
