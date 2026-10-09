// Probe: settings dialog controls.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('button', { hasText: 'Arthur' }).first().click();
  await page.waitForTimeout(800);
  await page.getByText('设置', { exact: true }).first().click();
  await page.waitForTimeout(1500);
  const dump = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return { noDialog: true, body: document.body.innerText.slice(0, 200) };
    const els = [...dlg.querySelectorAll('button,[role="radio"],[role="combobox"],select,[role="switch"],[aria-checked],[aria-pressed],[data-state],input')].filter(vis).map(e => ({ tag: e.tagName, text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 18), ariaChecked: e.getAttribute('aria-checked'), ariaPressed: e.getAttribute('aria-pressed'), state: e.getAttribute('data-state'), ariaLabel: e.getAttribute('aria-label'), role: e.getAttribute('role'), val: e.value }));
    return { count: els.length, els: els.slice(0, 80) };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
