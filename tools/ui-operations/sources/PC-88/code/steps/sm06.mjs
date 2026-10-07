// Step: SM-06 skill switch persistence.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const OUT = 'D:\\code\\test_agent_tpt_work\\探索性测试\\2026-10-06-冒烟测试\\运行\\pc88-20261006-smoke01';
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const NAME = 'smoke-skill-pc88-20261006-smoke01';
const sf = () => page.frames().find(f => f.url().includes('supcon-skills'));
async function ensureMenu(){ if (await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).count()===0) await page.getByRole('button',{name:'更多'}).click(); }
async function openSkills(){ let f=sf(); if(f) return f; await ensureMenu(); await page.locator('button.tpt-sidebar-action',{hasText:'技能'}).click(); await page.waitForTimeout(2500); return sf(); }
async function closeSkills(){ if(!sf()) return; await ensureMenu(); await page.locator('button.tpt-sidebar-action',{hasText:'技能'}).click(); await page.waitForTimeout(1200); }
async function toList(f){ const c=f.locator('button._crumb_ivdmc_34'); if(await c.count()){ await c.first().click({timeout:4000}).catch(()=>{}); await page.waitForTimeout(800);} }
async function read(term){ const f=await openSkills(); await toList(f); await f.locator('input[placeholder="搜索技能名称或描述"]').fill(term); await page.waitForTimeout(1200); await f.locator('.card-main').first().hover({timeout:5000}).catch(()=>{}); const sw=f.locator('.card-main [role=switch]').first(); return { present: await sw.count()>0, aria: await sw.getAttribute('aria-checked').catch(()=>null), state: await sw.getAttribute('data-state').catch(()=>null) }; }
async function setSwitch(on){ const f=await openSkills(); await toList(f); await f.locator('input[placeholder="搜索技能名称或描述"]').fill(NAME); await page.waitForTimeout(1200); const card=f.locator('.card-main').first(); await card.hover({timeout:5000}).catch(()=>{}); const sw=f.locator('.card-main [role=switch]').first(); const cur=await sw.getAttribute('aria-checked'); if((cur==='true')!==on){ await sw.click(); await page.waitForTimeout(1200);} return cur; }
try {
  for(let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);}
  const initial = await read(NAME);
  // A1: enable, leave & return
  const e0 = await setSwitch(true);
  await closeSkills(); const afterEnable = await read(NAME);
  // A2: disable, leave & return
  const d0 = await setSwitch(false);
  await closeSkills(); const afterDisable = await read(NAME);
  // A3: enable again
  await setSwitch(true);
  await closeSkills(); const final = await read(NAME);
  const result = {
    id:'SM-06', contract_version:'smoke-1.0', machine_id:'PC-88',
    assertions:{
      'SM-06-A1':{ read:'after enable, reopen list switch checked', actual:afterEnable.aria, expected:true, pass: afterEnable.aria==='true' },
      'SM-06-A2':{ read:'after disable, reopen list switch checked', actual:afterDisable.aria, expected:false, pass: afterDisable.aria==='false' },
      'SM-06-A3':{ read:'after final enable, reopen list switch checked', actual:final.aria, expected:true, pass: final.aria==='true' },
    },
    raw:{ initial, enableBefore:e0, afterEnable, disableBefore:d0, afterDisable, final },
  };
  fs.writeFileSync(path.join(OUT,'结果','SM-06.json'), JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} finally { await browser.close(); }
