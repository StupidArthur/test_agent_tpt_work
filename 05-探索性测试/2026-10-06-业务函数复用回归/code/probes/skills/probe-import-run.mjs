// Probe: perform a single-file skill import and inspect the resulting card.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const skillFile = 'F:/code_ai/test_agent_tpt_work/探索性测试/2026-10-06-业务函数复用回归/夹具/本轮/fn-20261006-agent2/skill-src/SKILL.md';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const frame = page.frames().find(f => f.url().includes('supcon-skills'));
  // dialog may already be open; ensure open
  if (!(await frame.locator('[role="dialog"]').count())) { await frame.getByRole('button', { name: '导入技能' }).click(); await page.waitForTimeout(1000); }
  const fileInput = frame.locator('input[type="file"][accept*=".md"]').first();
  await fileInput.setInputFiles(skillFile);
  await page.waitForTimeout(1000);
  const before = await frame.evaluate(() => (document.querySelector('[role="dialog"]') || {}).innerText || '');
  console.log('after setInputFiles dialog:', before.slice(0, 600));
  await frame.locator('[role="dialog"] button', { hasText: '导入' }).last().click().catch(async () => { await frame.getByRole('button', { name: '导入', exact: true }).click(); });
  await page.waitForTimeout(2500);
  const after = await frame.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const dlg = document.querySelector('[role="dialog"]');
    const cards = [...document.querySelectorAll('[class*="card"],li,article')].filter(vis).map(c => (c.innerText || '').trim().slice(0, 120)).filter(Boolean).slice(0, 15);
    return { dialogOpen: !!dlg, dialogText: dlg ? dlg.innerText.slice(0, 400) : null, cards };
  });
  console.log(JSON.stringify(after, null, 2));
} finally { await browser.close(); }
