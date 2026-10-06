import { withApp, dump, sleep, openSettings, openSettingsSection } from './lib.mjs';
await withApp(async (page) => {
  await openSettings(page);
  await openSettingsSection(page, '场景预设');
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth);
    return {
      buttons: [...dlg.querySelectorAll('button')].map(b => ({ t: norm(b.innerText).slice(0, 24), aria: b.getAttribute('aria-label'), cls: (b.className || '').toString().slice(0, 40), pressed: b.getAttribute('aria-pressed') })),
      cards: [...dlg.querySelectorAll('[class*="card"],[class*="Card"],[role="radio"]')].map(e => ({ cls: (e.className || '').toString().slice(0, 50), t: norm(e.innerText).slice(0, 40) })).slice(0, 12),
    };
  });
  dump('scene-controls', st);
});
