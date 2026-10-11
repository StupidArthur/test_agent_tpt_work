import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
try {
  const info = await page.evaluate(() => {
    const hits = [...document.querySelectorAll('*')].filter(e => e.children.length===0 && (e.textContent||'').trim() === 'SMOKE_CHAT_pc88-20261006-smoke01_OK');
    return hits.map(e => {
      const path = [];
      let n = e;
      for (let i=0;i<8 && n;i++){ path.push(`${n.tagName}.${String(n.className).slice(0,40)}${n.getAttribute('data-role')?'[data-role='+n.getAttribute('data-role')+']':''}`); n = n.parentElement; }
      return { text: e.textContent, path };
    });
  });
  console.log('EXACT_HITS', JSON.stringify(info, null, 2));
  const roles = await page.evaluate(() => [...document.querySelectorAll('[data-role],[data-message-role],[data-testid],[class*=message i],[class*=Message]')].filter(e=>e.getClientRects().length).slice(0,20).map(e=>({tag:e.tagName,cls:String(e.className).slice(0,50),dr:e.getAttribute('data-role'),dt:e.getAttribute('data-testid')})));
  console.log('CANDIDATE_ROLES', JSON.stringify(roles));
} finally { await browser.close(); }
