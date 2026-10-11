// Step: SM-08 import expert + detail.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const OUT = 'D:\\code\\test_agent_tpt_work\\探索性测试\\2026-10-06-冒烟测试\\运行\\pc88-20261006-smoke01';
const DIR = 'D:\\code\\test_agent_tpt_work\\探索性测试\\2026-10-06-冒烟测试\\夹具\\本轮\\pc88-20261006-smoke01\\expert';
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const ef = () => page.frames().find(f => f.url().includes('supcon-agents'));
const NAME = 'smoke-expert-pc88-20261006-smoke01';
try {
  for(let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);}
  let f = ef();
  if (!f) { if (await page.locator('button.tpt-sidebar-action', { hasText: '专家' }).count()===0) await page.getByRole('button',{name:'更多'}).click(); await page.locator('button.tpt-sidebar-action',{hasText:'专家'}).click(); await page.waitForTimeout(2500); f=ef(); }
  // return to list if detail open
  const crumb = f.locator('button[class*=crumb]'); if (await crumb.count()) { await crumb.first().click({timeout:4000}).catch(()=>{}); await page.waitForTimeout(800); }
  await f.getByRole('button', { name: '导入专家' }).click(); await page.waitForTimeout(800);
  await f.locator('input[type=file][webkitdirectory]').setInputFiles(DIR);
  await page.waitForTimeout(1200);
  console.log('AFTER_PICK', JSON.stringify((await f.locator('[role=dialog]:visible').innerText().catch(()=>'')).slice(0,300)));
  await f.getByRole('button', { name: '提交' }).click();
  await page.waitForTimeout(2500);
  const body = await f.locator('body').innerText();
  console.log('AFTER_SUBMIT_HEAD', JSON.stringify(body.slice(0,500)));
  // search by internal name
  const search = f.locator('input[placeholder*="搜索"], input[type=text]').first();
  const ph = await search.getAttribute('placeholder').catch(()=>null);
  console.log('SEARCH_PLACEHOLDER', ph);
  if (ph && /搜索/.test(ph)) { await search.fill(NAME); await page.waitForTimeout(1300); }
  const cards = await f.evaluate(() => [...document.querySelectorAll('[class*=card i]')].filter(e=>e.getClientRects().length && e.innerText.trim()).map(e=>({cls:String(e.className).slice(0,40),text:e.innerText.trim().replace(/\n+/g,' | ').slice(0,140)})));
  console.log('CARDS', JSON.stringify(cards, null, 2));
} finally { await browser.close(); }
