import { withApp, dump } from './lib.mjs';
await withApp(async (page) => {
  const st = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-row-key^="session:"]')];
    const withReq = rows.filter(e => (e.innerText || '').includes('固定回复规则'));
    return {
      total: rows.length,
      first5: rows.slice(0, 5).map(e => ({ k: e.getAttribute('data-row-key'), t: (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40) })),
      withReq: withReq.map(e => ({ k: e.getAttribute('data-row-key'), t: (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40) })),
    };
  });
  dump('session-rows-probe', st);
});
