import { withApp, dump, sleep, skillsFrame, closeSettings } from './lib.mjs';
await withApp(async (page) => {
  await closeSettings(page);
  const f = await skillsFrame(page);
  const back = async () => { for (let i = 0; i < 3; i++) { const d = await f.evaluate(() => !!document.querySelector('[class*="_page_"]')); if (!d) return; await f.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); const b = p && [...p.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '技能'); if (b) b.click(); }); await sleep(800); } };
  await back();
  const box = f.locator('input[placeholder="搜索技能名称或描述"]').first();
  await box.fill('fast-assert-rich-20261006-oc1'); await sleep(1200);
  await f.locator('[data-slot="card"]').first().locator('[data-slot="card-content"]').click({ timeout: 6000 });
  await sleep(1500);
  const st = await f.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const p = document.querySelector('[class*="_page_"]');
    return {
      text: p ? p.innerText.slice(0, 1500) : null,
      treeItems: p ? [...p.querySelectorAll('[class*="tree"] *,[role="treeitem"],[class*="_dir_"] *')].filter(e => e.children.length === 0 && norm(e.textContent)).map(e => ({ cls: (e.className || '').toString().slice(0, 40), t: norm(e.textContent).slice(0, 40) })).slice(0, 40) : [],
      buttons: p ? [...p.querySelectorAll('button')].map(b => ({ t: norm(b.innerText).slice(0, 20), aria: b.getAttribute('aria-label') })).slice(0, 30) : [],
    };
  });
  dump('rich-detail', st);
});
