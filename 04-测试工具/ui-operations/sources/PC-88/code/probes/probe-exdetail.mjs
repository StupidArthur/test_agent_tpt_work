// Probe: expert card detail.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const f = page.frames().find(fr => fr.url().includes('supcon-agents'));
try {
  const card = f.locator('._card_c5z1c_2').first();
  console.log('CARD_COUNT', await f.locator('._card_c5z1c_2').count());
  await card.click({ timeout: 8000 }).catch(e=>console.log('click err', e.message.slice(0,50)));
  await page.waitForTimeout(1600);
  const btns = await f.locator('button').evaluateAll(els=>els.filter(e=>e.getClientRects().length).map(e=>(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,20)).filter(Boolean));
  console.log('BTNS', JSON.stringify(btns));
  const body = await f.locator('body').innerText();
  console.log('BODY', JSON.stringify(body.slice(0,900)));
} finally { await browser.close(); }
