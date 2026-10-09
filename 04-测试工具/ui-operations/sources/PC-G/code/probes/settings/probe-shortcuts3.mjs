// Probe: shortcut editor dialog.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const dlg = page.locator('[data-shortcut-modal="settings"]');
  if (!(await dlg.count())) { await page.locator('button', { hasText: 'Arthur' }).first().click(); await page.waitForTimeout(700); await page.getByText('设置', { exact: true }).first().click(); await page.waitForTimeout(1200); await dlg.locator('button[class*="navCell"]').filter({ hasText: '常规' }).first().click(); await page.waitForTimeout(800); }
  await dlg.getByText('编辑快捷键', { exact: true }).first().click();
  await page.waitForTimeout(1500);
  const dialogs = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return [...document.querySelectorAll('[data-shortcut-modal]')].filter(vis).map(e => e.getAttribute('data-shortcut-modal'));
  });
  console.log('DIALOGS', JSON.stringify(dialogs));
  const body = await page.evaluate(() => {
    const el = document.querySelector('[data-shortcut-modal="keyboard-shortcuts"]') || document.querySelector('[data-shortcut-modal="shortcuts"]');
    return el ? el.innerText.replace(/\s+/g, ' ').slice(0, 700) : (document.body.innerText.replace(/\s+/g, ' ').slice(0, 600));
  });
  console.log('BODY', body);
  const rows = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return [...document.querySelectorAll('[class*="shortcut"], [class*="binding"], [class*="keymap"]')].filter(vis).map(e => (e.innerText || '').trim()).filter(t => t && t.length < 60).slice(0, 20);
  });
  console.log('ROWS', JSON.stringify(rows));
} finally { await browser.close(); }
