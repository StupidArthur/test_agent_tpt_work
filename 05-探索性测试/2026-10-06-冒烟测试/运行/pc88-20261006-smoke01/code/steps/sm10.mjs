// Step: SM-10 settings + shortcuts dialog.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const OUT = 'D:\\code\\test_agent_tpt_work\\探索性测试\\2026-10-06-冒烟测试\\运行\\pc88-20261006-smoke01';
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
async function openSettings() {
  for(let i=0;i<4;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(250);}
  await page.locator('button', { hasText: 'Arthur' }).first().click(); await page.waitForTimeout(700);
  await page.getByText('设置', { exact: true }).click(); await page.waitForTimeout(1500);
}
try {
  await openSettings();
  const setText = await page.locator('[role=dialog]:visible').last().innerText();
  const hasPerm = /权限/.test(setText), hasLang = /语言/.test(setText), hasAppear = /外观/.test(setText);
  await page.getByText('编辑快捷键', { exact: true }).click(); await page.waitForTimeout(1300);
  const rows = await page.evaluate(() => {
    const dlgs = [...document.querySelectorAll('[role=dialog]')].filter(e=>e.getClientRects().length);
    const d = dlgs[dlgs.length-1];
    const out = {};
    for (const el of d.querySelectorAll('.nhfO0a_commandLabel')) {
      const label = el.textContent.trim();
      const row = el.closest('li');
      const binding = row && row.querySelector('.nhfO0a_binding');
      out[label] = binding ? binding.innerText.replace(/\s+/g,' ').trim() : null;
    }
    return out;
  });
  const newConv = rows['新会话'] || null;
  const searchConv = rows['搜索会话'] || null;
  const result = {
    id:'SM-10', contract_version:'smoke-1.0', machine_id:'PC-88',
    assertions:{
      'SM-10-A1':{ read:'settings dialog has 权限/语言/外观 labels', hasPerm, hasLang, hasAppear, expected:true, pass: hasPerm && hasLang && hasAppear },
      'SM-10-A2':{ read:'shortcut dialog 新会话 & 搜索会话 non-empty combos', newConversation:newConv, searchConversation:searchConv, expected:true, pass: !!newConv && !!searchConv && newConv!==searchConv },
    },
    raw:{ setTextHead: setText.slice(0,200), rows },
  };
  fs.writeFileSync(path.join(OUT,'结果','SM-10.json'), JSON.stringify(result,null,2));
  // close both dialogs
  for(let i=0;i<4;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(250);}
  console.log(JSON.stringify(result,null,2));
} finally { await browser.close(); }
