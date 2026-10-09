// Probe: open skill detail and inspect its surface.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const frame = page.frames().find(f => f.url().includes('supcon-skills'));
  // clear search
  const s = frame.locator('input[aria-label="搜索技能"]').first();
  await s.fill(''); await page.waitForTimeout(1000);
  const card = frame.locator('[data-slot="card"]').filter({ has: frame.locator('.card-title h3', { hasText: '本轮快速回归技能' }) }).first();
  await card.locator('[data-slot="card-content"]').first().click();
  await page.waitForTimeout(2000);
  const dump = await frame.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const dialogs = [...document.querySelectorAll('[role="dialog"],[data-slot="dialog-content"],[class*="drawer"],[class*="modal"],[class*="detail"]')].filter(vis).map(d => ({ cls: (d.className||'').toString().slice(0,80), text: (d.innerText||'').trim().slice(0, 300) }));
    return { body: document.body.innerText.slice(0, 1800), dialogs };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
