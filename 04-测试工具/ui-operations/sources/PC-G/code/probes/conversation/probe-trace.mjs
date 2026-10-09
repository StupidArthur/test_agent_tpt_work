// Probe: inspect 轨迹(trace) tab and any file/product card containers.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const btns = await page.locator('button,[role="tab"]').allInnerTexts();
  console.log('buttons:', JSON.stringify(btns.filter(Boolean)));
  const tab = page.getByText('轨迹', { exact: true }).first();
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(1500); }
  const dump = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const classes = [...new Set([...document.querySelectorAll('*')].filter(vis).map(e => (e.className || '').toString()).filter(c => /file|product|artifact|trace|card|step/i.test(c)))].slice(0, 60);
    return { body: document.body.innerText.slice(0, 2500), classes };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
