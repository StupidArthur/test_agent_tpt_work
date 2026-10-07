// Probe: 常规 full content + shortcut entries.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const dlg = page.locator('[data-shortcut-modal="settings"]');
  if (!(await dlg.count())) { await page.locator('button', { hasText: 'Arthur' }).first().click(); await page.waitForTimeout(700); await page.getByText('设置', { exact: true }).first().click(); await page.waitForTimeout(1200); }
  await dlg.locator('button[class*="navCell"]').filter({ hasText: '常规' }).first().click();
  await page.waitForTimeout(1000);
  const text = await dlg.evaluate((d) => (d.innerText || '').replace(/\s+/g, ' '));
  console.log('LEN', text.length);
  console.log(text.slice(0, 1500));
  const kbd = await dlg.locator('button, [class*="key"], kbd').evaluateAll((els) => els.map(e => (e.innerText || '').trim()).filter(t => /Ctrl|Alt|Shift|⌘|新建|搜索/.test(t)).slice(0, 20));
  console.log('KBDBTN', JSON.stringify(kbd));
} finally { await browser.close(); }
