// Probe: preview.png attachment card structure.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const dump = await page.evaluate(() => {
    const area = document.querySelector('[data-slot="conversation.input.attachments"]');
    if (!area) return { none: true };
    const titles = [...area.querySelectorAll('[title]')].map(e => e.getAttribute('title'));
    const card = area.querySelector('[title="preview.png"]');
    return { titles, cardHtml: card ? card.outerHTML.slice(0, 1200) : null };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
