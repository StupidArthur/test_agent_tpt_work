import { withApp, dump, sleep, expertsFrame } from './lib.mjs';
await withApp(async (page) => {
  const f = await expertsFrame(page);
  const st = await f.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const pg = document.querySelector('[class*="_page_"]');
    return {
      hasPage: !!pg,
      body: norm(document.body.innerText).slice(0, 1200),
      buttons: [...document.querySelectorAll('button')].map(b => ({ t: norm(b.innerText).slice(0, 18), aria: b.getAttribute('aria-label'), vis: !!b.offsetWidth })).filter(b => b.vis || b.aria).slice(0, 40),
    };
  });
  dump('expert-frame-state', st);
});
