import { withApp, dump, sleep } from './lib.mjs';
await withApp(async (page) => {
  const frame = page.frame({ url: /supcon-skills/ });
  const cards = frame.locator('[data-slot="card"]').filter({ hasText: '本轮快速回归技能' });
  const n = await cards.count();
  const details = [];
  for (let i = 0; i < n; i++) {
    await cards.nth(i).locator('[data-slot="card-content"]').click({ timeout: 8000 });
    await sleep(1500);
    const d = await frame.evaluate(() => {
      const norm = s => (s || '').trim().replace(/\s+/g, ' ');
      const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(e => e.offsetWidth).map(x => x.innerText);
      const main = document.querySelector('main, [class*="detail"], [class*="Detail"]');
      return { dialogs: dlg.map(t => t.slice(0, 2500)), bodySnip: norm(document.body.innerText).slice(0, 300) };
    });
    details.push(d);
    await page.keyboard.press('Escape');
    await sleep(800);
  }
  dump('skill-detail-probe', { n, details });
});
