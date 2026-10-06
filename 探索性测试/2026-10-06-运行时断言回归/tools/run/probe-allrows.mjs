import { withApp, dump } from './lib.mjs';
await withApp(async (page) => {
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const rows = [...document.querySelectorAll('[data-row-key^="session:"]')].map(e => ({ k: e.getAttribute('data-row-key'), t: norm(e.innerText).slice(0, 40) }));
    return { total: rows.length, first10: rows.slice(0, 10), last10: rows.slice(-10) };
  });
  dump('allrows', st);
});
