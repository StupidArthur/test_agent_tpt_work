// Probe: read the live TPT Work main page over CDP. Read-only.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));

const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
try {
  const pages = browser.contexts().flatMap(c => c.pages());
  const info = [];
  for (const p of pages) info.push({ title: await p.title(), url: p.url() });
  console.log('TARGETS', JSON.stringify(info, null, 2));
  const page = pages.find(p => p.url().startsWith('dsh-app://')) ?? pages[0];
  if (!page) throw new Error('no page');
  console.log('SELECTED', await page.title(), page.url());
  await page.waitForTimeout(1500);
  const body = await page.locator('body').innerText();
  console.log('BODY_TEXT_START');
  console.log(body.slice(0, 4000));
  console.log('BODY_TEXT_END');
  console.log('dialogs:', await page.locator('[role="dialog"]:visible').count());
  const buttons = await page.locator('button:visible').evaluateAll(els => els.map(e => ({
    text: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 40),
    aria: e.getAttribute('aria-label'),
    title: e.getAttribute('title'),
  })).filter(b => b.text || b.aria || b.title));
  console.log('BUTTONS', JSON.stringify(buttons, null, 2));
} finally {
  await browser.close();
}
