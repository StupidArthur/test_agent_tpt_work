import { withApp, dump, sleep, skillsFrame, appendSend, waitTerminal, runningCount, SEL } from './lib.mjs';
const MY_NAME = 'fast-assert-skill-20261006-oc1';
const MY_TITLE = '本轮快速回归技能';
await withApp(async (page) => {
  const f = await skillsFrame(page);
  const back = async () => { for (let i = 0; i < 3; i++) { const d = await f.evaluate(() => !!document.querySelector('[class*="_page_"]')); if (!d) return; await f.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); const b = p && [...p.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '技能'); if (b) b.click(); }); await sleep(800); } };
  await back();
  const keys = () => page.evaluate(() => [...document.querySelectorAll('[data-row-key^="session:"]')].map(e => e.getAttribute('data-row-key')));
  const before = await keys();
  const cards = f.locator('[data-slot="card"]').filter({ hasText: MY_TITLE });
  await cards.nth(0).locator('[data-slot="card-content"]').click({ timeout: 8000 });
  await sleep(1300);
  const nm = await f.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); return p ? ((p.innerText.match(/name:\s*([^\s]+)/) || [])[1] || null) : null; });
  await page.getByRole('tab', { name: '对话', exact: true }).click({ timeout: 5000 }).catch(() => {});
  await sleep(500);
  await f.getByRole('button', { name: '使用', exact: true }).click({ timeout: 8000 });
  await sleep(3000);
  const afterUse = await keys();
  const composer = (await page.locator(SEL.composer).first().innerText()).trim();
  await page.getByRole('tab', { name: '对话', exact: true }).click({ timeout: 5000 }).catch(() => {});
  await sleep(400);
  await appendSend(page, '请执行本轮回归技能的固定回复规则');
  const term = await waitTerminal(page, { expect: 'FAST_SKILL_EXEC_OK', timeout: 120000 });
  await sleep(2500);
  const after = await keys();
  const newKey = after.find(k => !afterUse.includes(k)) ?? null;
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const req = '请执行本轮回归技能的固定回复规则';
    return {
      assistant: [...document.querySelectorAll('[class*="hWmORq_body"]')].map(e => norm(e.innerText)).filter(Boolean).slice(-3),
      userReqLeaf: [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && norm(e.textContent).includes(req)).map(e => norm(e.textContent).slice(0, 120)).slice(0, 2),
      tabs: [...document.querySelectorAll('[role="tab"]')].map(t => ({ t: norm(t.innerText), s: t.getAttribute('aria-selected') })),
    };
  });
  dump('use2', { nm, composer, beforeCount: before.length, afterUseCount: afterUse.length, afterCount: after.length, newKey, term, ...st });
});
