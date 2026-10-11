// Probe: dump settings sections rows/controls.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('button', { hasText: 'Arthur' }).first().click();
  await page.waitForTimeout(700);
  await page.getByText('设置', { exact: true }).first().click();
  await page.waitForTimeout(1500);
  const dlg = page.locator('[data-shortcut-modal="settings"]');
  for (const nav of ['常规', '记忆与进化', '实验性功能', '开发者模式', '内置插件']) {
    const cell = dlg.locator('button[class*="navCell"]').filter({ hasText: nav });
    if (await cell.count()) { await cell.first().click(); await page.waitForTimeout(1000); }
    const dump = await dlg.evaluate((d) => {
      const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const rows = [];
      for (const r of d.querySelectorAll('[class*="row"]')) {
        if (!vis(r)) continue;
        const t = (r.innerText || '').replace(/\s+/g, ' ').trim();
        if (t && t.length < 120) rows.push(t);
      }
      return rows.slice(0, 14);
    });
    console.log('=== ' + nav + ' ===\n' + JSON.stringify(dump, null, 1));
  }
} finally { await browser.close(); }
