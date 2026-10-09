import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
try {
  const items = await page.evaluate(() => [...document.querySelectorAll('[class*=flowItem]')].filter(e=>e.getClientRects().length).map(e => ({
    cls: String(e.className).slice(0,40),
    hasMarkdown: !!e.querySelector('[class*=markdown]'),
    bodyCls: e.querySelector('[class*=body]') ? String(e.querySelector('[class*=body]').className).slice(0,40) : null,
    text: e.innerText.trim().replace(/\n+/g,' | ').slice(0,120),
  })));
  console.log('FLOW_ITEMS', JSON.stringify(items, null, 2));
} finally { await browser.close(); }
