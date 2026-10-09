// Probe: mount chat from current view.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const rows = page.locator('[data-row-key^="session:"]');
  console.log('session rows:', await rows.count());
  const target = rows.filter({ hasText: '请只输出一个代码块' }).first();
  console.log('target count:', await target.count());
  if (await target.count()) { await target.click(); await page.waitForTimeout(1500); }
  console.log('after click session attr count:', await page.locator('[data-conversation-session]').count());
  if (!(await page.locator('[data-conversation-session]').count())) {
    const first = rows.first();
    if (await first.count()) { await first.click(); await page.waitForTimeout(1500); }
    console.log('after first row attr count:', await page.locator('[data-conversation-session]').count());
  }
  console.log((await page.locator('body').innerText()).slice(-800));
} finally { await browser.close(); }
