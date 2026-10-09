// Probe: expert 去对话编辑 entry.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  for (let i = 0; i < 2; i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('button[aria-label="专家"]').first().click();
  await page.waitForTimeout(1500);
  const frame = page.frames().find(f => f.url().includes('supcon-agents'));
  const card = frame.locator('div[class*="_card_"]').filter({ has: frame.locator('h3', { hasText: '本轮扩展专家-longread' }) }).first();
  await card.locator('div[class*="cursor-pointer"]').first().click();
  await page.waitForTimeout(1500);
  const hasEdit = await frame.getByText('去对话编辑', { exact: true }).count();
  console.log('去对话编辑 count', hasEdit);
  if (hasEdit) { await frame.getByText('去对话编辑', { exact: true }).first().click(); await page.waitForTimeout(2500); }
  const dump = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const c = document.querySelector('div[contenteditable="true"][aria-label*="/ 调用指令"]');
    const labels = [...document.querySelectorAll('*')].filter(vis).map(e => (e.innerText || '').trim()).filter(t => t && t.length < 60 && /编辑|修改/.test(t)).slice(0, 8);
    return { composer: c ? c.innerText : null, labels, bodyHead: document.body.innerText.slice(0, 400) };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
