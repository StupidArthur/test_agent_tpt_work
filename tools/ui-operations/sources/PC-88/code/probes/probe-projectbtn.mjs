import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
try {
  const info = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(e => (e.getAttribute('aria-label')||'').includes('smoketest'));
    return btns.map(b => ({ aria: b.getAttribute('aria-label'), text: b.textContent, html: b.outerHTML.slice(0, 400) }));
  });
  console.log(JSON.stringify(info, null, 2));
} finally { await browser.close(); }
