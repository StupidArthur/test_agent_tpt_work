// Probe: skill reference picker in composer.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const NAME = 'smoke-skill-pc88-20261006-smoke01';
try {
  for(let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);}
  // close skills panel if open
  const sk = page.locator('button.tpt-sidebar-action', { hasText: '技能' });
  if (page.frames().some(f=>f.url().includes('supcon-skills'))) { if(await sk.count()===0) await page.getByRole('button',{name:'更多'}).click(); await sk.click(); await page.waitForTimeout(1200); }
  await page.getByRole('button', { name: '新建任务' }).first().click(); await page.waitForTimeout(1200);
  const before = await page.locator('body').innerText();
  await page.getByRole('button', { name: '添加文件或调用指令' }).click(); await page.waitForTimeout(600);
  await page.getByText('技能', { exact: true }).last().click(); await page.waitForTimeout(1200);
  const after = await page.locator('body').innerText();
  console.log('PICKER_ADDED', JSON.stringify(after.replace(before,'').slice(0,700)));
  // find our skill entry
  const cnt = await page.getByText(NAME, { exact: false }).count();
  console.log('NAME_IN_PICKER', cnt);
  const items = await page.evaluate(() => [...document.querySelectorAll('[role=option],[role=menuitem],[role=listitem],li,button')].filter(e=>e.getClientRects().length).map(e=>({tag:e.tagName,role:e.getAttribute('role'),text:(e.innerText||'').trim().replace(/\n+/g,' | ').slice(0,60)})).filter(x=>x.text && /回归|skill|技能/.test(x.text)));
  console.log('ITEMS', JSON.stringify(items.slice(0,15), null, 2));
} finally { await browser.close(); }
