// Probe: current session id vs sidebar rows.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const current = await page.evaluate(() => document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session'));
  const rows = await page.$$eval('[data-row-key^="session:"]', (els) => els.map((e) => ({ key: e.getAttribute('data-row-key'), sel: e.getAttribute('aria-selected'), text: (e.innerText || '').replace(/\s+/g, ' ').slice(0, 30) })));
  console.log('current=', current);
  console.log('present=', rows.some((r) => r.key === 'session:' + current));
  console.log(rows.map((r) => (r.sel ? '*' : ' ') + r.key + ' | ' + r.text).join('\n'));
} finally { await browser.close(); }
