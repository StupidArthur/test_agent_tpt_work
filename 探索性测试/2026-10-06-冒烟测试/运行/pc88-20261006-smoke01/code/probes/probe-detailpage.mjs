import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const sf = page.frames().find(f => f.url().includes('supcon-skills'));
try {
  const btns = await sf.locator('button,[role=button],a').evaluateAll(els => els.filter(e=>e.getClientRects().length).map(e=>({tag:e.tagName,text:(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,24),aria:e.getAttribute('aria-label'),cls:String(e.className).slice(0,40)})).filter(x=>x.text||x.aria));
  console.log('BTNS', JSON.stringify(btns, null, 2));
  const bc = await sf.evaluate(() => { const el=[...document.querySelectorAll('*')].find(e=>e.children.length===0 && e.textContent.trim()==='详情'); return el? el.parentElement.outerHTML.slice(0,300):null; });
  console.log('BREADCRUMB', JSON.stringify(bc));
} finally { await browser.close(); }
