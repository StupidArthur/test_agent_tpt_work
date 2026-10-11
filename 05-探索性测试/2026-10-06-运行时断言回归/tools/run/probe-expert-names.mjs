import { withApp, dump, sleep, expertsFrame, closeSettings } from './lib.mjs';
await withApp(async (page) => {
  await closeSettings(page);
  const f = await expertsFrame(page);
  const back = async () => { for (let i = 0; i < 3; i++) { const d = await f.evaluate(() => /专家详情/.test(document.body.innerText)); if (!d) return; await f.getByRole('button', { name: '专家', exact: true }).first().click({ timeout: 5000 }).catch(() => {}); await sleep(700); } };
  await back();
  const names = [];
  const cards = f.locator('._card_c5z1c_2');
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    await cards.nth(i).locator('div.cursor-pointer').first().click({ timeout: 5000 }).catch(async () => { await cards.nth(i).click({ timeout: 5000 }); });
    await sleep(900);
    const nm = await f.evaluate(() => { const t = document.body.innerText; return /专家详情/.test(t) ? ((t.match(/name:\s*([^\s]+)/) || [])[1] || '(no-name)') : null; });
    names.push(nm);
    await back();
  }
  dump('expert-names', { n, names });
});
