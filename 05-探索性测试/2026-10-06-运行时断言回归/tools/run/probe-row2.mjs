import { withApp, dump } from './lib.mjs';
await withApp(async (page) => {
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const rows = [...document.querySelectorAll('[data-row-key^="session:"]')].map(e => ({ k: e.getAttribute('data-row-key'), t: norm(e.innerText).slice(0, 50) }));
    return { g8: rows.filter(r => /G8A|只回答/.test(r.t)).slice(0, 10), top: rows.slice(0, 8) };
  });
  dump('row-search', st);
});
