// Probe: 新会话 shortcut row structure.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  let sc = page.locator('[data-shortcut-modal="shortcuts"]');
  if (!(await sc.count())) {
    const dlg = page.locator('[data-shortcut-modal="settings"]');
    await page.locator('button', { hasText: 'Arthur' }).first().click(); await page.waitForTimeout(700);
    await page.getByText('设置', { exact: true }).first().click(); await page.waitForTimeout(1200);
    await dlg.locator('button[class*="navCell"]').filter({ hasText: '常规' }).first().click(); await page.waitForTimeout(600);
    await dlg.getByText('编辑快捷键', { exact: true }).first().click(); await page.waitForTimeout(1200);
    sc = page.locator('[data-shortcut-modal="shortcuts"]');
  }
  const info = await sc.evaluate((d) => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    let target = null;
    for (const el of d.querySelectorAll('*')) {
      if (vis(el) && (el.innerText || '').replace(/\s+/g, ' ').trim() === '新会话 Ctrl + N') { if (!target || (el.innerText || '').length < target.innerText.length) target = el; }
    }
    if (!target) {
      for (const el of d.querySelectorAll('*')) { const t = (el.innerText || '').replace(/\s+/g, ' ').trim(); if (vis(el) && t.startsWith('新会话') && t.length < 30) { target = el; } }
    }
    return target ? { text: target.innerText.replace(/\s+/g, ' '), html: target.outerHTML.replace(/\s+/g, ' ').slice(0, 600) } : { none: true };
  });
  console.log(JSON.stringify(info, null, 2));
} finally { await browser.close(); }
