import { withApp, dump, sleep } from './lib.mjs';
await withApp(async (page) => {
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const rows = [...document.querySelectorAll('[data-row-key^="session:"]')];
    const target = rows.find(e => /G8A_OK/.test(e.innerText || '')) || rows[0];
    return {
      count: rows.length,
      firstTexts: rows.slice(0, 3).map(e => ({ k: e.getAttribute('data-row-key'), t: norm(e.innerText).slice(0, 40) })),
      targetKey: target ? target.getAttribute('data-row-key') : null,
      targetButtons: target ? [...target.querySelectorAll('button')].map(b => ({ aria: b.getAttribute('aria-label'), cls: (b.className || '').toString().slice(0, 40), vis: !!b.offsetWidth })) : [],
    };
  });
  if (st.targetKey) { await page.locator(`[data-row-key="${st.targetKey}"]`).first().hover().catch(() => {}); await sleep(500); st.afterHover = await page.evaluate((k) => [...document.querySelector(`[data-row-key="${k}"]`).querySelectorAll('button')].map(b => ({ aria: b.getAttribute('aria-label'), vis: !!b.offsetWidth })), st.targetKey); }
  dump('row-probe', st);
});
