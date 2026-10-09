// Probe: trace table tool-call rows.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const tab = page.getByText('轨迹', { exact: true }).first();
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(2000); }
  const rows = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return [...document.querySelectorAll('tr[data-trajectory-row-key]')].filter(vis).map(r => ({ key: r.getAttribute('data-trajectory-row-key'), kind: r.getAttribute('data-kind'), text: (r.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 220) }));
  });
  console.log(JSON.stringify(rows, null, 2));
} finally { await browser.close(); }
