// Probe: scene preset controls.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const dlg = page.locator('[data-shortcut-modal="settings"]');
  if (!(await dlg.count())) {
    for (let i = 0; i < 2; i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
    await page.locator('button', { hasText: 'Arthur' }).first().click(); await page.waitForTimeout(700);
    await page.getByText('设置', { exact: true }).first().click(); await page.waitForTimeout(1200);
  }
  await page.locator('[data-shortcut-modal="settings"]').getByRole('button', { name: '场景预设' }).click();
  await page.waitForTimeout(1200);
  const dump = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const d = document.querySelector('[data-shortcut-modal="settings"]');
    const cards = [...d.querySelectorAll('*')].filter(vis).filter(e => /PTC/.test(e.innerText || '') && (e.innerText || '').length < 400);
    const out = [];
    if (cards.length) { const c = cards.reduce((a, b) => (a.innerText.length < b.innerText.length ? a : b)); out.push({ text: c.innerText.replace(/\s+/g, ' ').slice(0, 200), cls: (c.className || '').toString().split(' ')[0] }); }
    const btns = [...d.querySelectorAll('button,[role="switch"],[aria-pressed],[aria-checked]')].filter(vis).map(e => ({ t: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 16), checked: e.getAttribute('aria-checked'), pressed: e.getAttribute('aria-pressed'), cls: (e.className || '').toString().split(' ')[0] }));
    return { cards: out, btns: btns.slice(0, 40) };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
