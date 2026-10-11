// Probe: settings shortcut rows.
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
  const navs = await dlg.locator('button[class*="navCell"]').allInnerTexts().catch(() => []);
  console.log('NAVS', JSON.stringify(navs));
  const sc = dlg.locator('button[class*="navCell"]').filter({ hasText: '快捷键' });
  console.log('shortcut nav count', await sc.count());
  if (await sc.count()) {
    await sc.first().click(); await page.waitForTimeout(1200);
    const dump = await dlg.evaluate((d) => (d.innerText || '').replace(/\s+/g, ' ').slice(0, 600));
    console.log('CONTENT', dump);
  }
} finally { await browser.close(); }
