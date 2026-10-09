// Step: SM-12 cleanup / restore verification.
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
async function closeSkills(){ if(!sf()) return; await ensureMenu(); await page.locator('button.tpt-sidebar-action',{hasText:'技能'}).click(); await page.waitForTimeout(1000); }
async function toList(f){ const c=f.locator('button._crumb_ivdmc_34'); if(await c.count()){ await c.first().click({timeout:4000}).catch(()=>{}); await page.waitForTimeout(700);} }
async function readSwitch(){ const f=await openSkills(); await toList(f); await f.locator('input[placeholder="搜索技能名称或描述"]').fill(NAME); await page.waitForTimeout(1200); await f.locator('.card-main').first().hover({timeout:5000}).catch(()=>{}); const sw=f.locator('.card-main [role=switch]').first(); return await sw.getAttribute('aria-checked').catch(()=>null); }
try {
  for(let i=0;i<4;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(250);}
  // A1 disable skill and reopen
  const f = await openSkills(); await toList(f);
  await f.locator('input[placeholder="搜索技能名称或描述"]').fill(NAME); await page.waitForTimeout(1200);
  await f.locator('.card-main').first().hover(); const sw=f.locator('.card-main [role=switch]').first();
  if (await sw.getAttribute('aria-checked') === 'true') { await sw.click(); await page.waitForTimeout(1200); }
  await closeSkills();
  const afterDisable = await readSwitch();
  await closeSkills();
  // A2 theme
  await page.locator('button', { hasText: 'Arthur' }).first().click(); await page.waitForTimeout(700);
  await page.getByText('设置', { exact: true }).click(); await page.waitForTimeout(1500);
  const themeSel = await page.evaluate(() => { const dlg=[...document.querySelectorAll('[role=dialog]')].filter(e=>e.getClientRects().length).pop(); if(!dlg) return null; const b=[...dlg.querySelectorAll('button')].find(e=>['浅色','深色','跟随系统'].includes((e.innerText||'').trim()) && /selected/.test(String(e.className))); return b?b.innerText.trim():null; });
  for(let i=0;i<4;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);}
  // A3 draft clean
  await page.getByRole('button', { name: '新建任务' }).first().click(); await page.waitForTimeout(1200);
  const chipCount = await page.locator('span[class*=chip]').count();
  const attachCount = await page.locator('div[class*=card]').evaluateAll(els => els.filter(e => /smoke-note/.test(e.getAttribute('title')||'')).length);
  const dialogsOpen = await page.locator('[role=dialog]:visible').count();
  const a3pass = chipCount===0 && attachCount===0 && dialogsOpen===0 && afterDisable==='false' && themeSel==='跟随系统';
  const result = {
    id:'SM-12', contract_version:'smoke-1.0', machine_id:'PC-88',
    assertions:{
      'SM-12-A1':{ read:'reopen skill switch after disable', actual:afterDisable, expected:false, pass: afterDisable==='false' },
      'SM-12-A2':{ read:'final appearance option', actual:themeSel, expected:'跟随系统', pass: themeSel==='跟随系统' },
      'SM-12-A3':{ read:'attachments/popups/draft refs all recovered', chipCount, attachCount, dialogsOpen, afterDisable, themeSel, expected:true, pass: a3pass },
    },
    residuals:{ importedSkill:NAME, importedExpert:'smoke-expert-pc88-20261006-smoke01', expertDisabled:false, skillDisabled:true, sessionsRetained:['SM-03 chat','SM-07 skill','SM-09 expert'] },
  };
  fs.writeFileSync(path.join(OUT,'结果','SM-12.json'), JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} finally { await browser.close(); }
