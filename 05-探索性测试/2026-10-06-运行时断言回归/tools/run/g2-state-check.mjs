import { withApp, dump } from './lib.mjs';
await withApp(async (page) => {
  const frame = page.frame({ url: /supcon-skills/ });
  const st = await frame.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    return {
      hasPage: !!document.querySelector('[class*="_page_"]'),
      bodyTop: norm(document.body.innerText).slice(0, 400),
      visibleButtons: [...document.querySelectorAll('button')].filter(b => b.offsetWidth).map(b => norm(b.innerText).slice(0, 20)).filter(Boolean).slice(0, 25),
      dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(e => e.offsetWidth).length,
    };
  });
  dump('g2-state-check', st);
});
