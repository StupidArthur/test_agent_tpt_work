// Probe: dump attachment area HTML for image card.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const html = await page.evaluate(() => {
    const area = document.querySelector('[data-slot="conversation.input.attachments"]');
    return area ? area.outerHTML.replace(/\s+/g, ' ').slice(0, 2500) : null;
  });
  console.log(html);
} finally { await browser.close(); }
