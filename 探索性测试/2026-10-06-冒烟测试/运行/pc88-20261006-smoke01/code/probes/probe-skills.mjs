// Probe: navigate to skills page with robust menu-open handling.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const menuOpen = async () => await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).count() > 0;
const ensureMoreOpen = async () => {
  if (await menuOpen()) return;
  await page.getByRole('button', { name: '更多' }).click();
  await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).waitFor({ timeout: 5000 });
};
try {
  await ensureMoreOpen();
  await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).click();
  await page.waitForTimeout(2500);
  console.log('FRAMES', JSON.stringify(page.frames().map(f => f.url()), null, 2));
  for (const f of page.frames()) {
    const t = await f.locator('body').innerText().catch(() => '');
    if (t && t.trim()) console.log(`FRAME ${f.url()} BODY:\n${t.slice(0, 1800)}\n---`);
  }
  const inputs = await page.evaluate(() => [...document.querySelectorAll('input')].map(i => ({ type: i.type, accept: i.accept, placeholder: i.placeholder, cls: String(i.className).slice(0,40) })));
  console.log('INPUTS', JSON.stringify(inputs));
  const btns = await page.locator('button:visible').evaluateAll(els => els.map(e => (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 30)).filter(Boolean));
  console.log('BUTTONS', JSON.stringify(btns));
} finally { await browser.close(); }
