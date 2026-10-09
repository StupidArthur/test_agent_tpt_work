// Probe: click 快捷使用 on the round skill card and observe new session/composer.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const frame = page.frames().find(f => f.url().includes('supcon-skills'));
  if (await frame.locator('[class*="dir-preview"]').count()) {
    await frame.locator('[class*="page-top"]').getByText('技能', { exact: true }).first().click().catch(() => {});
    await page.waitForTimeout(1000);
  }
  const card = frame.locator('[data-slot="card"]').filter({ has: frame.locator('.card-title h3', { hasText: '本轮快速回归技能' }) }).first();
  await card.scrollIntoViewIfNeeded();
  await card.hover();
  const btn = card.getByText('快捷使用', { exact: true }).first();
  console.log('quick-use count', await btn.count());
  await btn.click();
  await page.waitForTimeout(2500);
  const dump = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const composer = document.querySelector('div[contenteditable="true"][aria-label*="调用指令"]');
    const chips = [...document.querySelectorAll('[class*="chip"],[class*="Chip"],[data-slot*="chip"],[class*="reference"]')].filter(vis).map(e => (e.innerText||'').trim().slice(0,60)).filter(Boolean);
    return { session: document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session'), composerText: composer ? composer.innerText : null, chips, body: document.body.innerText.slice(0, 800) };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
