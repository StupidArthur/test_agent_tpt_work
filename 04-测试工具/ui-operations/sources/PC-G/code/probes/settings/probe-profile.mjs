// Probe: 个人主页 identity fields.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  for (let i = 0; i < 2; i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('button', { hasText: 'Arthur' }).first().click(); await page.waitForTimeout(700);
  await page.getByText('设置', { exact: true }).first().click(); await page.waitForTimeout(1200);
  const dlg = page.locator('[data-shortcut-modal="settings"]');
  await dlg.locator('button[class*="navCell"]').filter({ hasText: '个人主页' }).first().click();
  await page.waitForTimeout(1200);
  const info = await dlg.evaluate((d) => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const inputs = [...d.querySelectorAll('input,textarea,[contenteditable="true"]')].filter(vis).map(e => ({ tag: e.tagName, type: e.type, disabled: e.disabled, readOnly: e.readOnly, ce: e.getAttribute('contenteditable'), value: (e.value || e.innerText || '').slice(0, 30), ph: e.getAttribute('placeholder') }));
    return { text: (d.innerText || '').replace(/\s+/g, ' ').slice(0, 500), inputs };
  });
  console.log(JSON.stringify(info, null, 1).slice(0, 1600));
  await page.keyboard.press('Escape');
} finally { await browser.close(); }
