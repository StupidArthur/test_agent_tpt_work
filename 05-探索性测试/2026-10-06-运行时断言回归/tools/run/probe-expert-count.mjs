import { withApp, dump, sleep, expertsFrame } from './lib.mjs';
await withApp(async (page) => {
  const f = await expertsFrame(page);
  // go back to list
  for (let i = 0; i < 3; i++) {
    const isDetail = await f.evaluate(() => /专家详情/.test(document.body.innerText));
    if (!isDetail) break;
    await f.getByRole('button', { name: '专家', exact: true }).first().click({ timeout: 5000 }).catch(() => {});
    await sleep(900);
  }
  const st = await f.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const cards = [...document.querySelectorAll('._card_c5z1c_2')].filter(e => norm(e.innerText).includes('本轮快速回归专家'));
    return { count: cards.length, totalCards: document.querySelectorAll('._card_c5z1c_2').length };
  });
  dump('expert-count', st);
});
