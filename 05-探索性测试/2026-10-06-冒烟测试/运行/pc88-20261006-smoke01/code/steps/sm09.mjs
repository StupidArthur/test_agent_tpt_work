// Step: SM-09 expert chip + fixed reply.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const OUT = 'D:\\code\\test_agent_tpt_work\\探索性测试\\2026-10-06-冒烟测试\\运行\\pc88-20261006-smoke01';
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const EXPERT = 'smoke-expert-pc88-20261006-smoke01';
const REPLY = 'SMOKE_EXPERT_pc88-20261006-smoke01_OK';
try {
  for(let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);}
  const chipText = await page.locator('span[class*=chip]').first().innerText().catch(()=>null);
  const chipTitle = await page.locator('span[class*=chip]').first().getAttribute('title').catch(()=>null);
  const chipCount = await page.locator('span[class*=chip]').count();
  // reasoning low
  const mb = page.getByRole('button', { name: /选择模型/ });
  if (!/推理等级 low/.test(await mb.getAttribute('aria-label'))) {
    await mb.click(); await page.waitForTimeout(500);
    await page.getByText('推理等级', { exact: true }).click(); await page.waitForTimeout(500);
    await page.getByRole('menuitemradio', { name: 'low' }).click(); await page.waitForTimeout(500);
  }
  const tb = page.getByRole('textbox').first();
  await tb.click(); await page.keyboard.insertText('请执行当前选中回归专家的固定回复规则，不使用工具。');
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '发送消息' }).click();
  const deadline = Date.now()+95000; let idle=false;
  while (Date.now()<deadline){ await page.waitForTimeout(1500); const stop=await page.getByRole('button',{name:/停止/}).count(); const b=await page.locator('body').innerText(); if(!stop && !/探索中|思考中|生成中|进行中|执行中/.test(b)){ idle=true; break; } }
  await page.waitForTimeout(800);
  const msgs = await page.evaluate(() => { const items=[...document.querySelectorAll('[class*=flowItem]')].filter(e=>e.getClientRects().length); const out=[]; for(const it of items){ const md=it.querySelector('[class*=markdown]'); if(md) out.push(md.innerText); } return out; });
  const last = msgs.length ? msgs[msgs.length-1].trim() : null;
  const mapped = chipText && chipText.startsWith('agent-') ? chipText.slice('agent-'.length) : chipText;
  const result = {
    id:'SM-09', contract_version:'smoke-1.0', machine_id:'PC-88',
    assertions:{
      'SM-09-A1':{ read:'expert chip identity (agent- prefix mapped)', chipRaw:chipText, chipTitle, mappedInternal:mapped, expected:EXPERT, pass: mapped===EXPERT },
      'SM-09-A2':{ read:'assistant final text trim', actual:last, expected:REPLY, pass: last===REPLY },
    },
    raw:{ chipCount, msgs, idle },
  };
  fs.writeFileSync(path.join(OUT,'结果','SM-09.json'), JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} finally { await browser.close(); }
