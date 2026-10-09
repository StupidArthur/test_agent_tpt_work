// Probe: composer @ menu and expert reference entry.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
try {
  for(let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);}
  // close experts panel
  if (page.frames().some(f=>f.url().includes('supcon-agents'))) { if (await page.locator('button.tpt-sidebar-action',{hasText:'专家'}).count()===0) await page.getByRole('button',{name:'更多'}).click(); await page.locator('button.tpt-sidebar-action',{hasText:'专家'}).click(); await page.waitForTimeout(1200); }
  await page.getByRole('button', { name: '新建任务' }).first().click(); await page.waitForTimeout(1200);
  const before = await page.locator('body').innerText();
  const tb = page.getByRole('textbox').first();
  await tb.click(); await page.keyboard.insertText('@'); await page.waitForTimeout(1000);
  console.log('AT_MENU', JSON.stringify((await page.locator('body').innerText()).replace(before,'').slice(0,700)));
  const items = await page.evaluate(()=>[...document.querySelectorAll('[role=option],[role=menuitem],[role=listitem]')].filter(e=>e.getClientRects().length).map(e=>({role:e.getAttribute('role'),text:(e.innerText||'').trim().replace(/\n+/g,' | ').slice(0,60)})).filter(x=>x.text));
  console.log('ITEMS', JSON.stringify(items, null, 2));
  await page.keyboard.press('Escape');
} finally { await browser.close(); }
