// Probe: experts page import dialog.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const ef = () => page.frames().find(f => f.url().includes('supcon-agents'));
try {
  for(let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);}
  let f = ef();
  if (!f) { if (await page.locator('button.tpt-sidebar-action', { hasText: '专家' }).count()===0) await page.getByRole('button',{name:'更多'}).click(); await page.locator('button.tpt-sidebar-action',{hasText:'专家'}).click(); await page.waitForTimeout(2500); f=ef(); }
  console.log('EXPERTS_FRAME', f.url());
  await f.getByRole('button', { name: '导入专家' }).click(); await page.waitForTimeout(900);
  console.log('DIALOG_TEXT', JSON.stringify(await f.locator('[role=dialog]:visible').innerText().catch(()=>'')));
  const inputs = await f.locator('input').evaluateAll(els => els.map(e=>({type:e.type,accept:e.accept,webkitdir:e.getAttribute('webkitdirectory'),cls:String(e.className).slice(0,30)})));
  console.log('INPUTS', JSON.stringify(inputs));
  const btns = await f.locator('[role=dialog]:visible button, [role=dialog]:visible [role=button]').evaluateAll(els=>els.map(e=>(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,20)).filter(Boolean));
  console.log('DIALOG_BUTTONS', JSON.stringify(btns));
} finally { await browser.close(); }
