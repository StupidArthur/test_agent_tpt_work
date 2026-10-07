import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const sf = page.frames().find(f => f.url().includes('supcon-skills'));
const NAME = 'smoke-skill-pc88-20261006-smoke01';
const dump = async (label) => {
  const dialogs = await sf.locator('[role=dialog]').count();
  const anyOverlay = await sf.evaluate(() => [...document.querySelectorAll('div')].filter(e=>{const s=getComputedStyle(e);return (s.position==='fixed'||s.position==='absolute')&&e.getClientRects().length&&e.innerText&&e.innerText.trim().length>20&&/内部|版本|来源|名称|详情|v1\.2/.test(e.innerText)}).map(e=>e.innerText.trim().slice(0,300)).slice(0,3));
  console.log(`== ${label} dialogs=${dialogs} overlays=${JSON.stringify(anyOverlay)}`);
};
try {
  await sf.locator('input[placeholder="搜索技能名称或描述"]').fill(NAME);
  await page.waitForTimeout(1200);
  await dump('before');
  await sf.locator('.card-title').first().click().catch(()=>{});
  await page.waitForTimeout(1200); await dump('after click card-title');
  await sf.locator('.card-head').first().click().catch(()=>{});
  await page.waitForTimeout(1200); await dump('after click card-head');
  // maybe 快捷使用 opens a menu with 详情
  const quick = sf.getByText('快捷使用').first();
  if (await quick.count()) { await quick.click(); await page.waitForTimeout(800); console.log('AFTER_QUICK_BODY', JSON.stringify((await sf.locator('body').innerText()).slice(0,600))); }
} finally { await browser.close(); }
