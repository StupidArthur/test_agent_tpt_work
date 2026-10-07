import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
try {
  const html = await page.evaluate(() => { const el=document.querySelector('[class*=chip]'); return el? el.outerHTML : null; });
  console.log('CHIP_HTML', html);
  const refs = await page.evaluate(() => [...document.querySelectorAll('[class*=reference]')].map(e=>e.outerHTML.slice(0,300)));
  console.log('REFS', JSON.stringify(refs, null, 2));
} finally { await browser.close(); }
