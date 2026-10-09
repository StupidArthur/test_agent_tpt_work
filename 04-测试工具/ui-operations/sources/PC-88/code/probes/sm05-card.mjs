// Probe: after search by internal name, dump the result card DOM.
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
  await page.waitForTimeout(1500);
  const txt = await sf.locator('body').innerText();
  console.log('SEARCHED_BODY', JSON.stringify(txt.slice(0, 700)));
  const clickables = await sf.evaluate(() => [...document.querySelectorAll('button,[role=button],[class*=card i],[class*=Card]')].filter(e=>e.getClientRects().length).map(e=>({tag:e.tagName,cls:String(e.className).slice(0,50),text:(e.innerText||'').trim().replace(/\n+/g,' | ').slice(0,80)})).filter(x=>x.text));
  console.log('CLICKABLES', JSON.stringify(clickables, null, 2));
  const si = await sf.evaluate(() => {
    const inp = document.querySelector('input[placeholder="搜索技能名称或描述"]');
    const cont = inp.closest('div')?.parentElement?.parentElement;
    return cont ? cont.innerText.slice(0,600) : null;
  });
  console.log('SEARCH_CONTAINER', JSON.stringify(si));
} finally { await browser.close(); }
