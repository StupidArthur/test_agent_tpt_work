// Probe: open an existing session and inspect conversation DOM structure.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  await page.keyboard.press('Escape').catch(()=>{});
  // open a recent session
  await page.getByText('只回复 A1', { exact: true }).first().click();
  await page.waitForTimeout(1500);
  const dump = await page.evaluate(() => {
    const vis = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const body = document.body.innerText;
    // find elements whose class contains 'body'
    const classes = [...document.querySelectorAll('*')].filter(vis).map(e => (e.className || '').toString()).filter(c => c && c.includes('body'));
    const uniqClasses = [...new Set(classes)].slice(0, 40);
    const codeEls = [...document.querySelectorAll('pre,code')].filter(vis).map(e => ({ tag: e.tagName, cls: (e.className||'').toString().slice(0,50), text: (e.innerText||'').slice(0,60) }));
    // running indicators
    const running = [...document.querySelectorAll('*')].filter(vis).map(e=>e.innerText).filter(t=>t==='进行中'||t==='探索中...').length;
    return { body: body.slice(0, 2500), uniqClasses, codeEls, running };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
