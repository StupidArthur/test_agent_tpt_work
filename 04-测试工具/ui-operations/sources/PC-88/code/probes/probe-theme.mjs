// Probe: appearance control + assistant body computed style.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const readTarget = async () => page.evaluate(() => {
  const bodies = [...document.querySelectorAll('[class*=body]')].filter(e=>e.getClientRects().length && e.querySelector('[class*=markdown]'));
  const el = bodies[bodies.length-1];
  if (!el) return null;
  const cs = getComputedStyle(el);
  const root = el.closest('[class*=root]') || el.parentElement;
  const cr = root ? getComputedStyle(root) : null;
  return { bodyColor: cs.color, bodyBg: cs.backgroundColor, rootColor: cr&&cr.color, rootBg: cr&&cr.backgroundColor, bodyCls: String(el.className).slice(0,40) };
});
try {
  for(let i=0;i<4;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);}
  console.log('TARGET_BEFORE', JSON.stringify(await readTarget()));
  await page.locator('button', { hasText: 'Arthur' }).first().click(); await page.waitForTimeout(700);
  await page.getByText('设置', { exact: true }).click(); await page.waitForTimeout(1500);
  const app = await page.evaluate(() => {
    const dlgs=[...document.querySelectorAll('[role=dialog]')].filter(e=>e.getClientRects().length); const d=dlgs[dlgs.length-1];
    const btns=[...d.querySelectorAll('button')].filter(e=>['浅色','深色','跟随系统'].includes((e.innerText||'').trim()));
    return btns.map(b=>({text:b.innerText.trim(),ariaPressed:b.getAttribute('aria-pressed'),ariaChecked:b.getAttribute('aria-checked'),cls:String(b.className).slice(0,60),dataState:b.getAttribute('data-state')}));
  });
  console.log('APPEARANCE_BTNS', JSON.stringify(app, null, 2));
} finally { await browser.close(); }
