import { withApp, dump, sleep, openSettings, closeSettings } from './lib.mjs';
await withApp(async (page) => {
  const sample = () => page.evaluate(() => {
    const sel = ['html', 'body', '#root', 'main', '[class*="hHd-Xa_root"]', '[class*="tpt-sidebar"]', '[class*="app"]', '[class*="Layout"]', '[class*="layout"]'];
    const o = {};
    for (const s of sel) { const e = document.querySelector(s); if (e) o[s] = getComputedStyle(e).backgroundColor; }
    // also first big div
    const big = [...document.querySelectorAll('div')].find(e => e.offsetWidth > 800 && e.offsetHeight > 500);
    if (big) o['bigdiv'] = getComputedStyle(big).backgroundColor;
    return o;
  });
  await openSettings(page);
  const before = await sample();
  await page.locator('[role="dialog"]:visible button[class*="themeCube"]').filter({ hasText: '深色' }).first().click({ timeout: 6000 });
  await sleep(1500);
  const after = await sample();
  await page.locator('[role="dialog"]:visible button[class*="themeCube"]').filter({ hasText: '跟随系统' }).first().click({ timeout: 6000 });
  await sleep(1000);
  await closeSettings(page);
  const diff = {};
  for (const k of Object.keys(before)) if (before[k] !== after[k]) diff[k] = [before[k], after[k]];
  dump('theme-surface', { before, after, diff });
});
