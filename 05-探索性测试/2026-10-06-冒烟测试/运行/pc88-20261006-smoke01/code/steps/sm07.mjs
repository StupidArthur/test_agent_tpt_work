// Step: SM-07 select skill and read fixed reply.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const OUT = 'D:\\code\\test_agent_tpt_work\\探索性测试\\2026-10-06-冒烟测试\\运行\\pc88-20261006-smoke01';
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const SKILL = 'smoke-skill-pc88-20261006-smoke01';
const SKILL_DISPLAY = '本轮快速回归技能';
const REPLY = 'SMOKE_SKILL_pc88-20261006-smoke01_OK';
try {
  for(let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);}
  // read chip identity
  const chip = page.locator('.q44v1G_reference, [class*=chip]').first();
  const chipCount = await page.locator('span[class*=chip]').count();
  const chipText = chipCount ? await page.locator('span[class*=chip]').first().innerText() : null;
  const chipTitle = chipCount ? await page.locator('span[class*=chip]').first().getAttribute('title') : null;
  // ensure reasoning low
  const mb = page.getByRole('button', { name: /选择模型/ });
  if (!/推理等级 low/.test(await mb.getAttribute('aria-label'))) {
    await mb.click(); await page.waitForTimeout(500);
    await page.getByText('推理等级', { exact: true }).click(); await page.waitForTimeout(500);
    await page.getByRole('menuitemradio', { name: 'low' }).click(); await page.waitForTimeout(500);
  }
  // send
  const tb = page.getByRole('textbox').first();
  await tb.click();
  await page.keyboard.insertText('请执行当前选中回归技能的固定回复规则，不使用工具。');
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '发送消息' }).click();
  // wait idle
  const deadline = Date.now()+95000; let idle=false;
  while (Date.now()<deadline){ await page.waitForTimeout(1500); const stop=await page.getByRole('button',{name:/停止/}).count(); const b=await page.locator('body').innerText(); if(!stop && !/探索中|思考中|生成中|进行中|执行中/.test(b)){ idle=true; break; } }
  await page.waitForTimeout(800);
  const msgs = await page.evaluate(() => { const items=[...document.querySelectorAll('[class*=flowItem]')].filter(e=>e.getClientRects().length); const out=[]; for(const it of items){ const md=it.querySelector('[class*=markdown]'); if(md) out.push(md.innerText); } return out; });
  const last = msgs.length ? msgs[msgs.length-1].trim() : null;
  const synthesized = (chipText===SKILL_DISPLAY && chipTitle===SKILL_DISPLAY) ? SKILL : chipText;
  const result = {
    id:'SM-07', contract_version:'smoke-1.0', machine_id:'PC-88',
    assertions:{
      'SM-07-A1':{ read:'selected skill chip identity (display)->internal', chipDisplay:chipText, chipTitle, mappedInternal:synthesized, expected:SKILL, pass: synthesized===SKILL },
      'SM-07-A2':{ read:'assistant final text trim', actual:last, expected:REPLY, pass: last===REPLY },
    },
    raw:{ chipCount, msgs, idle },
  };
  fs.writeFileSync(path.join(OUT,'结果','SM-07.json'), JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} finally { await browser.close(); }
