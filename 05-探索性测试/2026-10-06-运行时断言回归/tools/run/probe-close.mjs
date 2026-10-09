import { withApp, dump } from './lib.mjs';
await withApp(async (page) => {
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const dialogs = [...document.querySelectorAll('[role="dialog"], .VOzbGW_panel, .VOzbGW_overlay')].filter(e => e.offsetWidth).map(e => ({ cls: (e.className || '').toString().slice(0, 40), role: e.getAttribute('role'), text: norm(e.innerText).slice(0, 80), buttons: [...e.querySelectorAll('button')].map(b => ({ t: norm(b.innerText).slice(0, 12), aria: b.getAttribute('aria-label'), cls: (b.className || '').toString().slice(0, 30) })).slice(0, 8) }));
    return { dialogs };
  });
  dump('close-probe', st);
});
