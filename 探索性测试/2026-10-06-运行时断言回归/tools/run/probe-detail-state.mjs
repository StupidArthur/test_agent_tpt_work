import { withApp, dump, sleep } from './lib.mjs';
await withApp(async (page) => {
  const frame = page.frame({ url: /supcon-skills/ });
  const st = await frame.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const page_ = document.querySelector('[class*="_page_"]');
    const searchInputs = [...document.querySelectorAll('input')].map(e => ({ ph: e.getAttribute('placeholder'), type: e.type, cls: (e.className||'').toString().slice(0,40) }));
    return {
      hasDetailPage: !!page_,
      detailHead: page_ ? page_.innerText.slice(0, 400) : null,
      detailButtons: page_ ? [...page_.querySelectorAll('button')].map(b => ({ text: norm(b.innerText).slice(0,20), aria: b.getAttribute('aria-label') })) : [],
      searchInputs,
      bodyTop: norm(document.body.innerText).slice(0, 200),
    };
  });
  dump('skill-detail-state', st);
});
