// Probe: conversation text after expanding work steps.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const info = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const scroll = document.querySelector('[data-conversation-scroll]');
    const kinds = {};
    for (const el of document.querySelectorAll('[data-chat-flow-kind]')) { const k = el.getAttribute('data-chat-flow-kind'); kinds[k] = (kinds[k] || 0) + (vis(el) ? 1 : 0); }
    const toolish = [...document.querySelectorAll('[data-chat-flow-kind="tool"],[data-tool-call],[class*="toolCall"]')].filter(vis).map(e => (e.innerText || '').replace(/\s+/g, ' ').slice(0, 80));
    return { scrollText: scroll ? scroll.innerText.replace(/\s+/g, ' ').slice(0, 400) : null, kinds, toolishCount: toolish.length, toolish: toolish.slice(0, 5) };
  });
  console.log(JSON.stringify(info, null, 2));
} finally { await browser.close(); }
