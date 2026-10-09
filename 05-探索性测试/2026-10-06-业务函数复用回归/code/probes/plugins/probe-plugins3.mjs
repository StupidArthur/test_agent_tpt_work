// Probe: plugins main surface.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  await page.keyboard.press('Escape').catch(() => {});
  await page.locator('button[aria-label="插件"]:visible').first().click();
  await page.waitForTimeout(3000);
  const t = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const reg = [...document.querySelectorAll('[aria-expanded]')].filter(vis).map((e) => ({ cls: (e.className || '').toString().slice(0, 40), expanded: e.getAttribute('aria-expanded'), text: (e.innerText || '').replace(/\s+/g, ' ').slice(0, 70) })).filter((x) => x.text && x.text.length > 2);
    return reg.slice(0, 12);
  });
  console.log(JSON.stringify(t, null, 1).slice(0, 1400));
} finally { await browser.close(); }
