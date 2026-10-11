// Step: SM-01 connect evidence, SM-02 setup, SM-03 read existing chat reply.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const OUT = 'D:\\code\\test_agent_tpt_work\\探索性测试\\2026-10-06-冒烟测试\\运行\\pc88-20261006-smoke01';
const PORT = process.env.TPT_CDP_PORT ?? 9234;
const EXPECT = 'SMOKE_CHAT_pc88-20261006-smoke01_OK';
const PROJECT = 'smoketest';
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const jget = async (u) => (await fetch(u)).json();
try {
  // ---- SM-01 ----
  const version = await jget(`http://127.0.0.1:${PORT}/json/version`);
  const targets = await jget(`http://127.0.0.1:${PORT}/json/list`);
  const target = targets.find(t => t.type === 'page' && t.url.startsWith('dsh-app://'));
  const main = await page.locator('body').innerText();
  const mainReadable = /新建任务/.test(main) && /选择项目|描述你想要构建的内容/.test(main);
  const sm01 = {
    id:'SM-01', contract_version:'smoke-1.0', machine_id:'PC-88',
    assertions:{ 'SM-01-A1':{ read:'target url is TPT page + main readable', targetUrl: target?target.url:null, browser: version.Browser, mainReadable, expected:true, pass: !!target && target.url.startsWith('dsh-app://') && mainReadable } },
    package:{ exe:'C:\\Users\\Administrator\\AppData\\Local\\Programs\\tpt-work\\tpt-work.exe', exeVersion:'0.1.3.0', asar:'C:\\Users\\Administrator\\AppData\\Local\\Programs\\tpt-work\\resources\\app.asar', asarSize:253660790, asarSha256:'EF56656BC36C274428FCA2790B000DF756F43B823F071170D244AF1894CC2D9D' },
    raw:{ targets: targets.map(t=>({type:t.type,url:t.url,title:t.title})) },
  };

  // ---- SM-02 ----
  for(let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);}
  await page.getByRole('button', { name: '新建任务' }).first().click(); await page.waitForTimeout(1200);
  const tb = page.getByRole('textbox').first();
  const editorVisible = await tb.isVisible(); const editorEditable = await tb.isEditable();
  // clean refs
  let refsBefore = await page.locator('span[class*=chip]').count();
  while (refsBefore-- > 0) { const c=page.locator('span[class*=chip]').first(); if(!await c.count()) break; const parent=c.locator('xpath=..'); await c.click().catch(()=>{}); await page.keyboard.press('Escape').catch(()=>{}); await page.waitForTimeout(200); if(await page.locator('span[class*=chip]').count()===refsBefore) break; }
  const refCount = await page.locator('span[class*=chip]').count();
  await page.getByRole('button', { name: '选择项目' }).click(); await page.waitForTimeout(600);
  await page.getByText(PROJECT, { exact: true }).first().click(); await page.waitForTimeout(800);
  const projLabel = await page.locator('button[aria-label^="在"]').first().getAttribute('aria-label').catch(()=>null);
  const projName = projLabel ? (projLabel.match(/^在“(.+)”中新建会话$/)||[])[1] : null;
  const mb = page.getByRole('button', { name: /选择模型/ });
  if (!/推理等级 low/.test(await mb.getAttribute('aria-label'))) {
    await mb.click(); await page.waitForTimeout(500);
    await page.getByText('推理等级', { exact: true }).click(); await page.waitForTimeout(500);
    await page.getByRole('menuitemradio', { name: 'low' }).click(); await page.waitForTimeout(500);
  }
  const modelLabel = await mb.getAttribute('aria-label');
  const sm02 = {
    id:'SM-02', contract_version:'smoke-1.0', machine_id:'PC-88',
    assertions:{
      'SM-02-A1':{ read:'editor isVisible & editable', editorVisible, editorEditable, expected:true, pass: editorVisible && editorEditable },
      'SM-02-A2':{ read:'project control accessible text', projLabel, projName, expected:PROJECT, pass: projName === PROJECT },
      'SM-02-A3':{ read:'model control normalized', modelLabel, expected:'标准/low', pass: /标准/.test(modelLabel) && /推理等级 low/.test(modelLabel) },
    },
    raw:{ refCount },
  };

  // ---- SM-03: read existing chat session ----
  const row = page.locator('text=只回复：SMOKE_CHAT_pc88').first();
  if (await row.count()) { await row.click(); await page.waitForTimeout(2500); }
  const body = await page.locator('body').innerText();
  const msgs = await page.evaluate(() => { const items=[...document.querySelectorAll('[class*=flowItem]')].filter(e=>e.getClientRects().length); const out=[]; for(const it of items){ const md=it.querySelector('[class*=markdown]'); if(md) out.push(md.innerText); } return out; });
  const last = msgs.length ? msgs[msgs.length-1].trim() : null;
  const completed = /已完成工作/.test(body);
  const sm03 = {
    id:'SM-03', contract_version:'smoke-1.0', machine_id:'PC-88',
    assertions:{
      'SM-03-A1':{ read:'target assistant final text trim', actual:last, expected:EXPECT, pass: last===EXPECT },
      'SM-03-A2':{ read:'completion state', completed, expected:true, pass: completed },
    },
    raw:{ msgs },
  };
  for (const r of [sm01,sm02,sm03]) fs.writeFileSync(path.join(OUT,'结果',r.id+'.json'), JSON.stringify(r,null,2));
  console.log('SM01', JSON.stringify(sm01.assertions['SM-01-A1']));
  console.log('SM02', JSON.stringify(sm02.assertions));
  console.log('SM03', JSON.stringify(sm03.assertions));
} finally { await browser.close(); }
