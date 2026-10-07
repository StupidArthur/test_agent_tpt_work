// Probe: read the 轨迹 tab and look for skill resource loading.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const tab = page.getByText('轨迹', { exact: true }).first();
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(2000); }
  const text = await page.locator('body').innerText();
  const idx = text.indexOf('fast-assert-skill');
  console.log('contains internal name:', idx >= 0);
  console.log('contains skill_content:', text.includes('skill_content'), 'contains skills:', text.includes('/skills/'));
  if (idx >= 0) console.log('context:', JSON.stringify(text.slice(Math.max(0, idx - 400), idx + 400)));
  const els = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return [...document.querySelectorAll('*')].filter(vis).map(e => (e.innerText||'').trim()).filter(t => t && t.includes('fast-assert-skill')).slice(0, 5).map(t => t.slice(0, 300));
  });
  console.log('elements:', JSON.stringify(els, null, 2));
} finally { await browser.close(); }
