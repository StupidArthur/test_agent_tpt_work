import { withApp, dump, sleep, skillsFrame } from './lib.mjs';
await withApp(async (page) => {
  const frame = await skillsFrame(page);
  const back = async () => { for (let i = 0; i < 3; i++) { const d = await frame.evaluate(() => !!document.querySelector('[class*="_page_"]')); if (!d) return; await frame.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); const b = p && [...p.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '技能'); if (b) b.click(); }); await sleep(800); } };
  await back();
  const box = frame.locator('input[placeholder="搜索技能名称或描述"]').first();
  const test = async (term) => { await box.click().catch(() => {}); await box.fill(term); await sleep(1200); return frame.locator('[data-slot="card"]').count(); };
  const r1 = await test('fast-assert-skill-20261006-oc1');
  const r2 = await test('FastRegressionSkillUnique');
  const r3 = await test('regression-description-unique-token');
  await box.fill(''); await sleep(800);
  dump('search-probe', { internalName: r1, englishName: r2, descToken: r3 });
});
