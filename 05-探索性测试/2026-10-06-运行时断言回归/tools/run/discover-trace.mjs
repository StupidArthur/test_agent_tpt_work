import { withApp, dump, sleep } from './lib.mjs';
await withApp(async (page) => {
  // open a completed session that used a skill
  const row = page.locator('[data-row-key]').filter({ hasText: 'Please explicitly invoke this Skill' }).first();
  await row.click({ timeout: 8000 }).catch(() => {});
  await sleep(2500);
  await page.getByRole('tab', { name: '轨迹', exact: true }).click({ timeout: 8000 }).catch(async () => {
    await page.locator('text=轨迹').first().click({ timeout: 8000 }).catch(() => {});
  });
  await sleep(2000);
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const panel = [...document.querySelectorAll('main, [class*="trace"], [class*="Trace"]')].map(e => norm(e.innerText)).join('\n').slice(0, 2500);
    const resourceEls = [...document.querySelectorAll('[class*="resource"],[class*="Resource"],[data-slot*="tool"],[data-slot*="resource"]')].slice(0, 30).map(e => ({ cls: (e.className||'').toString().slice(0,50), text: norm(e.innerText).slice(0, 80) }));
    return { panel, resourceEls };
  });
  dump('trace-probe', st);
});
