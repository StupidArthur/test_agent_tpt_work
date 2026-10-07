// Step: SM-04 assertions.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const OUT = 'D:\\code\\test_agent_tpt_work\\探索性测试\\2026-10-06-冒烟测试\\运行\\pc88-20261006-smoke01';
const FILE = 'D:\\code\\test_agent_tpt_work\\探索性测试\\2026-10-06-冒烟测试\\夹具\\本轮\\pc88-20261006-smoke01\\smoke-note.txt';
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const countCards = async () => page.locator('div[class*=card]').evaluateAll(els => els.filter(e => /smoke-note/.test(e.getAttribute('title') || '') || /smoke-note\.txt/.test(e.innerText)).length);
try {
  for(let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);}
  await page.getByRole('button', { name: '新建任务' }).first().click(); await page.waitForTimeout(1200);
  // remove any pre-existing attachments from the earlier probe
  let pre = await page.locator('button[aria-label^="移除文件"]').count();
  while (pre-- > 0) { await page.locator('button[aria-label^="移除文件"]').first().click(); await page.waitForTimeout(700); }
  await page.locator('input[type=file]').first().setInputFiles(FILE);
  await page.waitForTimeout(1500);
  const addedName = await page.locator('span[class*=name]', { hasText: 'smoke-note.txt' }).count();
  const afterAddCount = await countCards();
  // remove
  const rm = page.locator('button[aria-label^="移除文件"]').first();
  const rmCount = await page.locator('button[aria-label^="移除文件"]').count();
  await rm.click();
  await page.waitForTimeout(1200);
  const afterRemoveCount = await countCards();
  const result = {
    id:'SM-04', contract_version:'smoke-1.0', machine_id:'PC-88',
    assertions:{
      'SM-04-A1':{ read:'draft attachment area contains smoke-note.txt', actual: afterAddCount, expected:true, pass: afterAddCount>0 },
      'SM-04-A2':{ read:'draft attachment file-card count after remove', actual: afterRemoveCount, expected:0, pass: afterRemoveCount===0 },
    },
    raw:{ addedName, rmCount },
  };
  fs.writeFileSync(path.join(OUT,'结果','SM-04.json'), JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} finally { await browser.close(); }
