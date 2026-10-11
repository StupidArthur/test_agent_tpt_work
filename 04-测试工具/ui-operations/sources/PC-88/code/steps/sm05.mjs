// Step: SM-05 assertions.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const RUN = 'pc88-20261006-smoke01';
const OUT = 'D:\\code\\test_agent_tpt_work\\探索性测试\\2026-10-06-冒烟测试\\运行\\' + RUN;
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const NAME = 'smoke-skill-pc88-20261006-smoke01';
try {
  for (let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200); }
  let sf = page.frames().find(f => f.url().includes('supcon-skills'));
  if (!sf) {
    if (await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).count() === 0) await page.getByRole('button', { name: '更多' }).click();
    await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).click();
    await page.waitForTimeout(2500);
    sf = page.frames().find(f => f.url().includes('supcon-skills'));
  }
  // return to list if a detail page is open
  const crumbBack = sf.locator('button._crumb_ivdmc_34');
  if (await crumbBack.count()) {
    await crumbBack.first().click({ timeout: 4000 }).catch(()=>{});
    await page.waitForTimeout(1000);
  }
  // A1 search unique
  await sf.locator('input[placeholder="搜索技能名称或描述"]').fill(NAME);
  await page.waitForTimeout(1300);
  const cards = await sf.locator('.card-main').evaluateAll(els => els.map(e => ({ title: e.querySelector('.card-title')?.innerText?.trim(), foot: e.querySelector('.card-foot')?.innerText?.replace(/\n+/g,' | ') })));
  const body = await sf.locator('body').innerText();
  const occ = body.split(NAME).length - 1;
  // detail
  await sf.locator('.card-main').first().hover();
  await sf.locator('.card-main').first().click({ timeout: 8000 }).catch(()=>{});
  await page.waitForTimeout(1600);
  const dbody = await sf.locator('body').innerText();
  const nameM = dbody.match(/\r?\nname:\s*([^\r\n]+)/);
  const verM = dbody.match(/版本\s*\n?\s*([0-9]+\.[0-9]+\.[0-9]+)/) || dbody.match(/\n([0-9]+\.[0-9]+\.[0-9]+)(?=\n)/);
  const srcM = dbody.match(/来源\s*\n?\s*([^\n]+)/);
  const result = {
    id: 'SM-05', contract_version: 'smoke-1.0', machine_id: 'PC-88',
    assertions: {
      'SM-05-A1': { read: 'search result card count for internal name', actualCards: cards.length, nameOccurrences: occ, expected: 1, pass: cards.length === 1 },
      'SM-05-A2': { read: 'detail SKILL.md name field', actual: nameM ? nameM[1].trim() : null, expected: NAME, pass: nameM && nameM[1].trim() === NAME },
      'SM-05-A3': { read: 'detail version', actual: verM ? verM[1].trim() : null, expected: '1.2.3', pass: verM && verM[1].trim() === '1.2.3' },
      'SM-05-A4': { read: 'detail source category', actual: srcM ? srcM[1].trim() : null, expectedRaw: '用户创建', expectedNormalized: '用户', pass: srcM && srcM[1].trim() === '用户创建' },
    },
    raw: { cards, detailTail: dbody.slice(0, 600) },
  };
  fs.writeFileSync(path.join(OUT, '结果', 'SM-05.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result.assertions, null, 2));
} finally { await browser.close(); }
