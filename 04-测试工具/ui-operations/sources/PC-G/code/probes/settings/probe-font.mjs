// Probe: font stepper controls.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  // ensure settings on 常规
  const dlg = page.locator('[data-shortcut-modal="settings"]');
  if (!(await dlg.count())) { await page.locator('button', { hasText: 'Arthur' }).first().click(); await page.waitForTimeout(700); await page.getByText('设置', { exact: true }).first().click(); await page.waitForTimeout(1200); }
  await page.locator('[data-shortcut-modal="settings"]').getByRole('button', { name: '常规' }).click();
  await page.waitForTimeout(800);
  const dump = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const d = document.querySelector('[data-shortcut-modal="settings"]');
    let row = null;
    for (const el of d.querySelectorAll('*')) { if (vis(el) && /字号大小/.test(el.innerText || '') && (el.innerText || '').length < 120) { row = el; break; } }
    if (!row) return { none: true };
    const btns = [...row.querySelectorAll('button')].map(b => ({ t: (b.innerText || '').trim(), aria: b.getAttribute('aria-label'), cls: (b.className || '').toString().split(' ')[0], disabled: b.disabled }));
    const text = row.innerText.replace(/\s+/g, ' ').trim();
    const chain = []; let cur = row; for (let i = 0; i < 4 && cur; i++) { chain.push(cur.tagName + '.' + ((cur.className || '').toString().split(' ')[0])); cur = cur.parentElement; }
    return { text: text.slice(0, 120), btns, chain };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
