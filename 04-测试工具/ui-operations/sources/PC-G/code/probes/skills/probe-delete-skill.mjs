// Probe: delete the round skill card (cleanup of an exploratory import), then report.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const frame = page.frames().find(f => f.url().includes('supcon-skills'));
  const card = frame.locator('[data-slot="card"]').filter({ has: frame.locator('.card-title h3', { hasText: '本轮快速回归技能' }) }).first();
  console.log('card count', await card.count());
  await card.scrollIntoViewIfNeeded();
  await card.hover();
  await page.waitForTimeout(500);
  const del = card.locator('button[aria-label="删除"]').first();
  console.log('delete btn count', await del.count());
  await del.click();
  await page.waitForTimeout(1200);
  const dlgText = await frame.evaluate(() => { const d = document.querySelector('[role="dialog"]'); return d ? d.innerText : null; });
  console.log('confirm dialog:', dlgText);
  const confirm = frame.locator('[role="dialog"]').getByRole('button', { name: /删除|确定|确认/ });
  if (await confirm.count()) { await confirm.last().click(); await page.waitForTimeout(1500); }
  const cnt = await frame.locator('[data-slot="card"]').filter({ has: frame.locator('.card-title h3', { hasText: '本轮快速回归技能' }) }).count();
  console.log('remaining round cards:', cnt);
} finally { await browser.close(); }
