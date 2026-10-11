// Probe: skill card DOM + detail dialog.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const sf = page.frames().find(f => f.url().includes('supcon-skills'));
if (!sf) throw new Error('open skills page first');
const NAME = 'smoke-skill-pc88-20261006-smoke01';
try {
  await sf.locator('input[placeholder="搜索技能名称或描述"]').fill(NAME);
  await page.waitForTimeout(1200);
  const struct = await sf.evaluate((nm) => {
    const leaf = [...document.querySelectorAll('*')].find(e => e.children.length===0 && (e.textContent||'').includes(nm));
    if (!leaf) return { found:false };
    const path=[]; let n=leaf;
    for (let i=0;i<9 && n;i++){ path.push(`${n.tagName}.${String(n.className).slice(0,45)}`); n=n.parentElement; }
    // card candidate: nearest ancestor with a button
    let card=leaf; for (let i=0;i<8 && card;i++){ if (card.querySelector && card.querySelector('button')) break; card=card.parentElement; }
    const btns = card ? [...card.querySelectorAll('button')].map(b=>({t:(b.innerText||b.getAttribute('aria-label')||'').trim().slice(0,24),cls:String(b.className).slice(0,30),role:b.getAttribute('role')})) : [];
    return { found:true, path, cardCls: card?String(card.className).slice(0,60):null, cardText: card?card.innerText.trim().slice(0,200):null, btns, sw: card?!!card.querySelector('[role=switch],input[type=checkbox]'):false };
  }, NAME);
  console.log('CARD_STRUCT', JSON.stringify(struct, null, 2));
  // open detail by clicking the name leaf
  await sf.locator(`text=${NAME}`).first().click();
  await page.waitForTimeout(1200);
  const dlg = await sf.locator('[role=dialog]:visible').count();
  console.log('DETAIL_DIALOGS', dlg);
  if (dlg) console.log('DETAIL_TEXT', JSON.stringify(await sf.locator('[role=dialog]:visible').innerText()));
} finally { await browser.close(); }
