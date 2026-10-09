// Probe: plugins page cards.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  for (let i = 0; i < 2; i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
  await page.keyboard.press('Escape').catch(() => {});
  const pbtn = page.locator('button[aria-label="插件"]').first();
  await pbtn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(3000);
  console.log('FRAMES', JSON.stringify(page.frames().map((f) => f.url()).filter((u) => u.includes('supcon') || u.startsWith('dsh-app://app/'))));
  const info = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const cards = [...document.querySelectorAll('[aria-expanded],[data-state],[class*="card"]')].filter(vis).map((e) => ({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 40), expanded: e.getAttribute('aria-expanded'), text: (e.innerText || '').replace(/\s+/g, ' ').slice(0, 50) })).filter((x) => x.text);
    return cards.slice(0, 10);
  });
  console.log('CARDS', JSON.stringify(info, null, 1).slice(0, 1200));
} finally { await browser.close(); }
