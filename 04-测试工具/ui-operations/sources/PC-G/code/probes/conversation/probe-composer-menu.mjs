// Probe: composer @ and + menus.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  for (let i = 0; i < 2; i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('button[aria-label="新建任务"]').first().click(); await page.waitForTimeout(1200);
  const composer = page.locator('div[contenteditable="true"]').first();
  for (const trig of ['@', '+']) {
    await composer.click(); await page.keyboard.press('End'); await page.keyboard.insertText(trig);
    await page.waitForTimeout(1500);
    const dump = await page.evaluate(() => {
      const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const pops = [...document.querySelectorAll('[class*="popover"],[class*="Popover"],[class*="menu"],[class*="Menu"],[class*="dropdown"],[role="menu"],[role="listbox"],[class*="command"]')].filter(vis);
      const out = pops.map((el) => ({ cls: (el.className || '').toString().slice(0, 50), text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 200) }));
      return out.slice(0, 6);
    });
    console.log('=== ' + trig + ' ===\n' + JSON.stringify(dump, null, 1).slice(0, 900));
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    await composer.click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
    await page.waitForTimeout(300);
  }
} finally { await browser.close(); }
