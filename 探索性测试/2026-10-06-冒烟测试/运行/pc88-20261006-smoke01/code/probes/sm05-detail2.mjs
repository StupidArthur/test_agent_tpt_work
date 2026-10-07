// Probe: card hover + detail dialog + switch.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const sf = page.frames().find(f => f.url().includes('supcon-skills'));
if (!sf) throw new Error('open skills first');
const NAME = 'smoke-skill-pc88-20261006-smoke01';
try {
  await sf.locator('input[placeholder="搜索技能名称或描述"]').fill(NAME);
  await page.waitForTimeout(1200);
  const card = sf.locator('.card-main').first();
  await card.hover(); await page.waitForTimeout(600);
  const sw = await card.locator('[role=switch],input[type=checkbox],button').evaluateAll(els=>els.map(e=>({tag:e.tagName,role:e.getAttribute('role'),aria:e.getAttribute('aria-label'),cls:String(e.className).slice(0,40),text:(e.innerText||'').trim().slice(0,20)})));
  console.log('CARD_CONTROLS', JSON.stringify(sw, null, 2));
  await card.click(); await page.waitForTimeout(1500);
  console.log('DIALOG_COUNT', await sf.locator('[role=dialog]:visible').count());
  console.log('DIALOG_TEXT', JSON.stringify(await sf.locator('[role=dialog]:visible').innerText().catch(()=>'')));
} finally { await browser.close(); }
