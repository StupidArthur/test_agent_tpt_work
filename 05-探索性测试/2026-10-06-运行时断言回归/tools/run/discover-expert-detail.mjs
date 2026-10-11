import { withApp, dump, sleep, expertsFrame } from './lib.mjs';
await withApp(async (page) => {
  const f = await expertsFrame(page);
  const card = f.locator('[data-slot="card"]').filter({ hasText: '本轮快速回归专家' }).first();
  await card.locator('[data-slot="card-content"]').click({ timeout: 8000 }).catch(async () => { await card.click({ timeout: 8000 }); });
  await sleep(1800);
  const st = await f.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const page_ = document.querySelector('[class*="_page_"]');
    return {
      hasPage: !!page_,
      text: norm(document.body.innerText).slice(0, 3000),
      editables: document.querySelectorAll('textarea, [contenteditable="true"]').length,
      buttons: [...document.querySelectorAll('button')].filter(b => b.offsetWidth).map(b => norm(b.innerText).slice(0, 20)).filter(Boolean).slice(0, 30),
    };
  });
  dump('expert-detail', st);
});
