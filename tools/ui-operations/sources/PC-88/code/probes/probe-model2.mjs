// Probe: click reasoning-level row.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
try {
  for (let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200); }
  await page.getByRole('button', { name: /选择模型/ }).click(); await page.waitForTimeout(700);
  const before = await page.locator('body').innerText();
  await page.getByText('推理等级', { exact: true }).click(); await page.waitForTimeout(800);
  console.log('AFTER_CLICK_ADDED', JSON.stringify((await page.locator('body').innerText()).replace(before,'').slice(0,400)));
  const menus = await page.evaluate(() => [...document.querySelectorAll('[role=menu],[role=listbox],[role=radiogroup]')].filter(e=>e.getClientRects().length).map(e=>e.innerText.trim().slice(0,200)));
  console.log('MENUS', JSON.stringify(menus));
  const opts = await page.evaluate(() => [...document.querySelectorAll('[role=menuitemradio],[role=menuitem],[role=option],[role=radio]')].filter(e=>e.getClientRects().length).map(e=>({role:e.getAttribute('role'),text:e.innerText.trim().slice(0,20),checked:e.getAttribute('aria-checked')})));
  console.log('OPTIONS', JSON.stringify(opts));
} finally { await browser.close(); }
