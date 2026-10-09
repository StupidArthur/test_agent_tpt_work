// Probe: expand remaining sessions then list rows.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const exp = page.getByText('展开其余', { exact: false }).first();
  if (await exp.count()) { await exp.click(); await page.waitForTimeout(1200); }
  const rows = await page.$$eval('[data-row-key^="session:"]', (els) => els.map((e) => ({ key: e.getAttribute('data-row-key'), text: (e.innerText || '').replace(/\s+/g, ' ').slice(0, 40) })));
  console.log(rows.map((r) => r.key + ' | ' + r.text).join('\n'));
} finally { await browser.close(); }
