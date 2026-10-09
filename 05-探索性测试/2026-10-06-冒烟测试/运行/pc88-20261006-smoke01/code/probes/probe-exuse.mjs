// Probe: expert 使用 entry -> session chip.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
try {
  for(let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);}
  // clear composer
  const tb = page.getByRole('textbox').first();
  if (await tb.count()) { await tb.click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Delete'); await page.waitForTimeout(300); }
  // open experts
  if (!page.frames().some(f=>f.url().includes('supcon-agents'))) { if (await page.locator('button.tpt-sidebar-action',{hasText:'专家'}).count()===0) await page.getByRole('button',{name:'更多'}).click(); await page.locator('button.tpt-sidebar-action',{hasText:'专家'}).click(); await page.waitForTimeout(2500); }
  const f = page.frames().find(fr=>fr.url().includes('supcon-agents'));
  const crumb = f.locator('button[class*=crumb]'); if (await crumb.count()) { await crumb.first().click({timeout:4000}).catch(()=>{}); await page.waitForTimeout(800); }
  await f.locator('._card_c5z1c_2').first().click({timeout:8000}).catch(()=>{}); await page.waitForTimeout(1500);
  // click 使用
  const use = f.getByRole('button', { name: '使用' });
  console.log('USE_COUNT', await use.count());
  await use.first().click({timeout:6000}).catch(e=>console.log('use err', e.message.slice(0,50)));
  await page.waitForTimeout(2500);
  console.log('FRAMES', JSON.stringify(page.frames().map(x=>x.url())));
  const chips = await page.evaluate(()=>[...document.querySelectorAll('[class*=chip],[class*=reference]')].filter(e=>e.getClientRects().length).map(e=>({cls:String(e.className).slice(0,40),text:(e.innerText||'').trim().slice(0,40),title:e.getAttribute('title')})));
  console.log('CHIPS', JSON.stringify(chips));
  console.log('BODY_TAIL', JSON.stringify((await page.locator('body').innerText()).split('\n').filter(Boolean).slice(-12)));
} finally { await browser.close(); }
