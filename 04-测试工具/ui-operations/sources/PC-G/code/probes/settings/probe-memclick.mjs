// Probe: memory checkbox state and toggle attempt.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const dlg = page.locator('[data-shortcut-modal="settings"]');
  const row = dlg.locator('[class*="cfg-row"]').filter({ hasText: '启用记忆' }).first();
  const info1 = await row.locator('input').first().evaluate((e) => ({ checked: e.checked, disabled: e.disabled, readOnly: e.readOnly, pointerEvents: getComputedStyle(e).pointerEvents, outer: e.outerHTML.slice(0, 120) }));
  console.log('before', JSON.stringify(info1));
  await row.locator('input').first().click({ force: true });
  await page.waitForTimeout(1200);
  const info2 = await row.locator('input').first().evaluate((e) => ({ checked: e.checked, disabled: e.disabled }));
  console.log('after', JSON.stringify(info2));
} finally { await browser.close(); }
