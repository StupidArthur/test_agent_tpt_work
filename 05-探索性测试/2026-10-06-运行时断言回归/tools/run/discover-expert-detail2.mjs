import { withApp, dump, sleep, expertsFrame } from './lib.mjs';
await withApp(async (page) => {
  const f = await expertsFrame(page);
  const card = f.locator('._card_c5z1c_2').filter({ hasText: '本轮快速回归专家' }).first();
  await card.locator('div.cursor-pointer').first().click({ timeout: 8000 });
  await sleep(1800);
  const st = await f.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const pg = document.querySelector('[class*="_page_"]');
    return {
      hasPage: !!pg,
      body: norm(document.body.innerText).slice(0, 2500),
      pageCls: pg ? pg.className : null,
      buttons: [...document.querySelectorAll('button')].filter(b => b.offsetWidth).map(b => norm(b.innerText).slice(0, 18)).filter(Boolean).slice(0, 25),
    };
  });
  dump('expert-detail2', st);
});
