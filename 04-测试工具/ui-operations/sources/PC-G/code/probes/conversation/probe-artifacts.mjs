// Probe: find file/product artifact card container in a session that produced a file.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const item = page.getByText('请用 pwsh 执行这个脚本', { exact: false }).first();
  if (await item.count()) { await item.click(); await page.waitForTimeout(2000); }
  const res = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const slots = [...new Set([...document.querySelectorAll('[data-slot]')].map(e => e.getAttribute('data-slot')))];
    const cls = [...new Set([...document.querySelectorAll('*')].filter(vis).map(e => (e.className || '').toString()).filter(c => /file|artifact|product|attach|download|deliver/i.test(c)))].slice(0, 60);
    // any element whose class includes 'card'
    const cards = [...document.querySelectorAll('*')].filter(vis).map(e => (e.className || '').toString()).filter(c => /card/i.test(c)).slice(0, 30);
    return { slots: slots.filter(s => /file|artifact|product|attach|deliver|tool|result/i.test(s)), cards };
  });
  console.log(JSON.stringify(res, null, 2));
  console.log('--- body tail ---');
  console.log((await page.locator('body').innerText()).slice(-1500));
} finally { await browser.close(); }
