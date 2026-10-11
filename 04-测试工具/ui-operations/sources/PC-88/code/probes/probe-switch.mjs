import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const sf = page.frames().find(f => f.url().includes('supcon-skills'));
const NAME = 'smoke-skill-pc88-20261006-smoke01';
try {
  // return to list if detail open
  const crumb = sf.getByText('技能', { exact: true });
  if (await crumb.count() > 1) { await crumb.first().click({ timeout: 3000 }).catch(()=>{}); await page.waitForTimeout(800); }
  await sf.locator('input[placeholder="搜索技能名称或描述"]').fill(NAME).catch(()=>{});
  await page.waitForTimeout(1200);
  const card = sf.locator('.card-main').first();
  console.log('CARD_COUNT', await sf.locator('.card-main').count());
  await card.hover({ timeout: 4000 }).catch(()=>{});
  const sw = await sf.locator('[role=switch]').evaluateAll(els => els.map(e => ({ ariaChecked: e.getAttribute('aria-checked'), dataState: e.getAttribute('data-state'), cls: String(e.className).slice(0,50), html: e.outerHTML.slice(0,220) })));
  console.log('SWITCHES', JSON.stringify(sw, null, 2));
} finally { await browser.close(); }
