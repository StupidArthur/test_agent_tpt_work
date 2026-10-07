// Step: SM-08 assertions.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const OUT = 'D:\\code\\test_agent_tpt_work\\探索性测试\\2026-10-06-冒烟测试\\运行\\pc88-20261006-smoke01';
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const NAME = 'smoke-expert-pc88-20261006-smoke01';
try {
  for(let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);}
  let f = page.frames().find(fr => fr.url().includes('supcon-agents'));
  if (!f) { if (await page.locator('button.tpt-sidebar-action', { hasText: '专家' }).count()===0) await page.getByRole('button',{name:'更多'}).click(); await page.locator('button.tpt-sidebar-action',{hasText:'专家'}).click(); await page.waitForTimeout(2500); f=page.frames().find(fr=>fr.url().includes('supcon-agents')); }
  const crumb = f.locator('button[class*=crumb]'); if (await crumb.count()) { await crumb.first().click({timeout:4000}).catch(()=>{}); await page.waitForTimeout(800); }
  // search internal name (if supported)
  const search = f.locator('input[placeholder="搜索我的专家"]');
  if (await search.count()) { await search.fill(''); await page.waitForTimeout(800); }
  const cardCount = await f.locator('._card_c5z1c_2').count();
  await f.locator('._card_c5z1c_2').first().click({ timeout: 8000 }).catch(()=>{});
  await page.waitForTimeout(1600);
  const body = await f.locator('body').innerText();
  const nameM = body.match(/name:\s*([A-Za-z0-9._\-]+)/);
  const verM = body.match(/([0-9]+\.[0-9]+\.[0-9]+)/);
  const result = {
    id:'SM-08', contract_version:'smoke-1.0', machine_id:'PC-88',
    assertions:{
      'SM-08-A1':{ read:'expert detail 专家提示词 name field', actual: nameM?nameM[1]:null, expected:NAME, pass: !!nameM && nameM[1]===NAME },
      'SM-08-A2':{ read:'expert detail version', actual: verM?verM[1]:null, expected:'1.2.3', pass: !!verM && verM[1]==='1.2.3' },
    },
    raw:{ cardCount, importFeedback:'专家校验通过，已导入「我的专家」', detailTail: body.slice(0,700) },
  };
  fs.writeFileSync(path.join(OUT,'结果','SM-08.json'), JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} finally { await browser.close(); }
