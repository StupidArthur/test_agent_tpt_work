import { withApp, dump, sleep } from './lib.mjs';

await withApp(async (page) => {
  const row = page.locator('.VOzbGW_triggerRow').first();
  await row.hover({ timeout: 5000 }).catch(e => { });
  await sleep(400);
  const before = await page.evaluate(() => {
    const b = document.querySelector('button[aria-label="设置"]');
    const cs = getComputedStyle(b);
    return { display: cs.display, rect: (r => ({ x: r.x, y: r.y, w: r.width, h: r.height }))(b.getBoundingClientRect()) };
  });
  let clicked = null;
  if (before.display !== 'none') {
    try { await page.locator('button[aria-label="设置"]').click({ timeout: 5000 }); clicked = 'hover+click'; }
    catch (e) { clicked = 'err ' + e.message; }
  }
  await sleep(1200);
  const state = await page.evaluate(() => ({
    overlays: [...document.querySelectorAll('[role="dialog"],[data-state="open"],[aria-modal="true"]')].map(e => ({ tag: e.tagName, role: e.getAttribute('role'), visible: !!(e.offsetWidth || e.offsetHeight), text: (e.innerText || '').slice(0, 300) })),
    settingsExpanded: document.querySelector('button[aria-label="设置"]')?.getAttribute('aria-expanded'),
  }));
  await page.screenshot({ path: 'tools/run/scratch/after-settings-click.png' });
  dump('settings-click-result', { before, clicked, state });
});
