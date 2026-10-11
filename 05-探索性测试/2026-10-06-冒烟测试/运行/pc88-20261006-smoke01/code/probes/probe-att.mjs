import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
try {
  const info = await page.evaluate(() => {
    const leaf = [...document.querySelectorAll('*')].find(e=>e.children.length===0 && (e.textContent||'').trim()==='smoke-note.txt');
    if (!leaf) return { found:false };
    const path=[]; let n=leaf;
    for (let i=0;i<7&&n;i++){ path.push(`${n.tagName}.${String(n.className).slice(0,45)}`); n=n.parentElement; }
    let card=leaf; for(let i=0;i<6&&card;i++){ if(card.querySelector && card.getAttribute && card.className && /file|attach|card/i.test(String(card.className))) break; card=card.parentElement; }
    return { found:true, path, cardCls: card?String(card.className).slice(0,60):null, cardHtml: card?card.outerHTML.slice(0,300):null };
  });
  console.log(JSON.stringify(info, null, 2));
} finally { await browser.close(); }
