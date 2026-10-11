// Probe: locate tool detail container class.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
  const tab = page.getByText('轨迹', { exact: true }).first();
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(1500); }
  await page.locator('tr[data-kind="tool"]').last().click();
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    let best = null;
    for (const el of document.querySelectorAll('*')) {
      if (!vis(el)) continue;
      const t = (el.innerText || '');
      if (t.includes('Schema') && t.includes('参数') && t.includes('结果')) { if (!best || t.length < best.len) best = { el, len: t.length }; }
    }
    if (!best) return { none: true };
    const chain = []; let cur = best.el;
    for (let i = 0; i < 6 && cur; i++) { const at = {}; for (const a of cur.attributes) at[a.name] = String(a.value).slice(0, 70); chain.push({ tag: cur.tagName, attrs: at, len: (cur.innerText || '').length }); cur = cur.parentElement; }
    const has200 = best.el.innerText.includes('FAST_LONG_LINE_200');
    return { chain, has200, len: best.len };
  });
  console.log(JSON.stringify(info, null, 2));
} finally { await browser.close(); }
