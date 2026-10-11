// Probe: 记忆与进化 toggles.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('button', { hasText: 'Arthur' }).first().click(); await page.waitForTimeout(700);
  await page.getByText('设置', { exact: true }).first().click(); await page.waitForTimeout(1500);
  const dlg = page.locator('[data-shortcut-modal="settings"]');
  await dlg.locator('button[class*="navCell"]').filter({ hasText: '记忆与进化' }).first().click();
  await page.waitForTimeout(1200);
  const dump = await dlg.evaluate((d) => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const out = [];
    for (const el of d.querySelectorAll('[role],[aria-checked],[aria-pressed],[data-state]')) {
      if (!vis(el)) continue;
      out.push({ tag: el.tagName, role: el.getAttribute('role'), checked: el.getAttribute('aria-checked'), pressed: el.getAttribute('aria-pressed'), state: el.getAttribute('data-state'), cls: (el.className || '').toString().split(' ')[0], text: (el.innerText || '').trim().slice(0, 24) });
    }
    return out.slice(0, 20);
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
