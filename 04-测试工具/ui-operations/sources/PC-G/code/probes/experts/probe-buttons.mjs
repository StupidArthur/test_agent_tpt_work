// Probe: experts page buttons + import dialog.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  for (let i = 0; i < 2; i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('button[aria-label="专家"]').first().click();
  await page.waitForTimeout(2500);
  const f = page.frames().find(fr => fr.url().includes('supcon-agents'));
  const btns = await f.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return [...document.querySelectorAll('button')].filter(vis).map((e) => (e.innerText || '').trim()).filter((t) => t && t.length < 12);
  });
  console.log('BTNS', JSON.stringify([...new Set(btns)]));
  const btn = f.getByText('导入专家', { exact: true }).first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(1800);
    const info = await page.evaluate(() => {
      const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const inputs = [...document.querySelectorAll('input')].filter(vis).map((e) => ({ type: e.type, webkit: e.hasAttribute('webkitdirectory'), accept: e.getAttribute('accept'), hidden: e.offsetParent === null }));
      const dtxt = [...document.querySelectorAll('[role="dialog"],[class*="dialog"],[class*="Dialog"]')].filter(vis).map((e) => (e.innerText || '').replace(/\s+/g, ' ').slice(0, 120));
      return { inputs, dialogText: dtxt };
    });
    console.log('IMPORT', JSON.stringify(info).slice(0, 700));
  }
} finally { await browser.close(); }
