// Probe: 启用记忆/启用沉淀 toggle elements.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const dlg = page.locator('[data-shortcut-modal="settings"]');
  if (!(await dlg.count())) { await page.locator('button', { hasText: 'Arthur' }).first().click(); await page.waitForTimeout(700); await page.getByText('设置', { exact: true }).first().click(); await page.waitForTimeout(1200); await dlg.locator('button[class*="navCell"]').filter({ hasText: '记忆与进化' }).first().click(); await page.waitForTimeout(1000); }
  const info = await dlg.evaluate((d) => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    let target = null;
    for (const el of d.querySelectorAll('*')) { if (vis(el) && (el.innerText || '').trim().startsWith('启用记忆') && (el.innerText || '').length < 80) { if (!target || (el.innerText || '').length < target.innerText.length) target = el; } }
    if (!target) return { none: true };
    const row = target.closest('*');
    return { rowText: (row.innerText || '').replace(/\s+/g, ' ').slice(0, 80), html: row.outerHTML.replace(/\s+/g, ' ').slice(0, 900) };
  });
  console.log(JSON.stringify(info, null, 2));
} finally { await browser.close(); }
