import { withApp, dump, sleep, expertsFrame, SEL } from './lib.mjs';
await withApp(async (page) => {
  const f = await expertsFrame(page);
  const back = async () => { for (let i = 0; i < 3; i++) { const d = await f.evaluate(() => /专家详情/.test(document.body.innerText)); if (!d) return; await f.getByRole('button', { name: '专家', exact: true }).first().click({ timeout: 5000 }).catch(() => {}); await sleep(800); } };
  await back();
  const cards = f.locator('._card_c5z1c_2').filter({ hasText: '本轮快速回归专家' });
  let ok = false;
  for (let i = 0; i < await cards.count(); i++) {
    await cards.nth(i).locator('div.cursor-pointer').first().click({ timeout: 6000 }).catch(() => {});
    await sleep(1200);
    const nm = await f.evaluate(() => { const t = document.body.innerText; return (t.match(/name:\s*(fast-assert-[^\s]+)/) || [])[1] || null; });
    if (nm === 'fast-assert-expert-20261006-oc1') { await f.getByRole('button', { name: '使用', exact: true }).click({ timeout: 6000 }); ok = true; break; }
    await back();
  }
  await sleep(3000);
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    return {
      composer: norm(document.querySelector('[contenteditable="true"]')?.innerText || ''),
      composerHtml: document.querySelector('[contenteditable="true"]')?.innerHTML?.slice(0, 800),
      tabs: [...document.querySelectorAll('[role="tab"]')].map(t => ({ t: norm(t.innerText), s: t.getAttribute('aria-selected') })),
    };
  });
  dump('expert-use', { ok, ...st });
});
