// Probe: expert detail view structure.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const frame = page.frames().find(f => f.url().includes('supcon-agents'));
  const card = frame.locator('div[class*="_card_"]').filter({ has: frame.locator('h3', { hasText: '本轮快速回归专家' }) }).first();
  await card.locator('div.cursor-pointer, [class*="cursor-pointer"]').first().click();
  await page.waitForTimeout(2000);
  const dump = await frame.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const editable = [...document.querySelectorAll('textarea,[contenteditable="true"]')].filter(vis).length;
    const folderBtns = [...document.querySelectorAll('button')].filter(vis).filter(b => /打开文件夹|文件夹|目录|本地目录/.test((b.innerText||'') + (b.getAttribute('aria-label')||''))).length;
    const btns = [...document.querySelectorAll('button')].filter(vis).map(b => ({ t: (b.innerText||'').trim().slice(0,24), aria: b.getAttribute('aria-label') })).filter(b=>b.t||b.aria);
    const pres = [...document.querySelectorAll('pre,[class*="prompt"],[class*="readonly"]')].filter(vis).map(e => (e.innerText||'').slice(0,120));
    return { body: document.body.innerText.slice(0, 1500), editable, folderBtns, btns, pres };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
