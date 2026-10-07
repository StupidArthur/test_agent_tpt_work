// Step/probe: SM-05 import skill + search + detail.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const skillsFrame = () => page.frames().find(f => f.url().includes('supcon-skills'));
const NAME = 'smoke-skill-pc88-20261006-smoke01';
const FILE = 'D:\\code\\test_agent_tpt_work\\探索性测试\\2026-10-06-冒烟测试\\夹具\\本轮\\pc88-20261006-smoke01\\skill\\SKILL.md';
async function openSkills() {
  let f = skillsFrame(); if (f) return f;
  if (await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).count() === 0) { await page.getByRole('button', { name: '更多' }).click(); }
  await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).click();
  await page.waitForTimeout(2500);
  f = skillsFrame(); if (!f) throw new Error('no skills frame'); return f;
}
try {
  for (let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200); }
  const sf = await openSkills();
  const search = sf.locator('input[placeholder="搜索技能名称或描述"]');
  await search.fill(NAME); await page.waitForTimeout(1000);
  console.log('BEFORE_IMPORT_MATCHES', await sf.getByText(NAME, { exact: false }).count());
  await search.fill(''); await page.waitForTimeout(600);

  await sf.getByRole('button', { name: '导入技能' }).click(); await page.waitForTimeout(800);
  await sf.locator('input[type=file][accept=".zip,.md"]').setInputFiles(FILE);
  await page.waitForTimeout(800);
  console.log('AFTER_PICK_DIALOG', JSON.stringify((await sf.locator('[role=dialog]:visible').innerText().catch(()=>''))));
  await sf.getByRole('button', { name: '导入' }).click();
  await page.waitForTimeout(2000);
  console.log('AFTER_IMPORT_DIALOG_COUNT', await sf.locator('[role=dialog]:visible').count());
  console.log('AFTER_IMPORT_BODY_HEAD', JSON.stringify((await sf.locator('body').innerText()).slice(0, 400)));

  await search.fill(NAME); await page.waitForTimeout(1200);
  const body = await sf.locator('body').innerText();
  const occurrences = body.split(NAME).length - 1;
  console.log('SEARCH_NAME_OCCURRENCES', occurrences);
  const cards = await sf.evaluate((nm) => {
    const els = [...document.querySelectorAll('*')].filter(e => e.children.length && (e.innerText||'').includes(nm) && (e.innerText||'').length < 600);
    return els.slice(-4).map(e => ({ tag: e.tagName, cls: String(e.className).slice(0,50), text: e.innerText.trim().slice(0,180) }));
  }, NAME);
  console.log('CARDS', JSON.stringify(cards, null, 2));
  // try open card
  const card = sf.locator('text=' + NAME).first();
  console.log('CARD_TAG', await card.evaluate(e => e.tagName).catch(()=>null));
} finally { await browser.close(); }
