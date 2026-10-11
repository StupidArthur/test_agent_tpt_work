// Probe: skill ZIP import dialog candidates.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  await page.keyboard.press('Escape').catch(() => {});
  await page.locator('button[aria-label="技能"]').first().click();
  await page.waitForTimeout(3000);
  const frame = page.frames().find(fr => fr.url().includes('supcon-skills'));
  const openBtn = frame.getByRole('button', { name: '导入技能' });
  if (await openBtn.count()) { await openBtn.first().click(); await page.waitForTimeout(1200); }
  const zip = 'F:/code_ai/test_agent_tpt_work/探索性测试/2026-10-06-业务函数复用回归/夹具/本轮/fn-20261006-agent2/zips/root.zip';
  const fileInput = frame.locator('input[type="file"], input[webkitdirectory]').first();
  await fileInput.setInputFiles(zip);
  await page.waitForTimeout(1500);
  const dump = await frame.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const d = [...document.querySelectorAll('[role="dialog"],[class*="dialog"],[class*="Dialog"],[class*="modal"]')].filter(vis);
    return d.map((e) => (e.innerText || '').replace(/\s+/g, ' ').slice(0, 400));
  });
  console.log('DIALOG', JSON.stringify(dump, null, 1).slice(0, 1000));
  await page.keyboard.press('Escape').catch(() => {});
} finally { await browser.close(); }
