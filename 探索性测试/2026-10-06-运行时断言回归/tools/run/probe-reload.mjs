import { withApp, dump, sleep, closeSettings, newTask, typeAndSend, waitTerminal } from './lib.mjs';
await withApp(async (page) => {
  await closeSettings(page);
  await newTask(page);
  await typeAndSend(page, '只回答：RELOAD_OK');
  const term = await waitTerminal(page, { expect: 'RELOAD_OK', timeout: 90000 });
  const before = await page.evaluate(() => [...document.querySelectorAll('[data-row-key^="session:"]')].filter(e => /RELOAD_OK/.test(e.innerText || '')).length);
  await page.reload({ waitUntil: 'load' }).catch(() => {});
  await sleep(4000);
  const after = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-row-key^="session:"]')];
    return { count: rows.length, hasReload: rows.filter(e => /RELOAD_OK/.test(e.innerText || '')).map(e => e.getAttribute('data-row-key')), top3: rows.slice(0, 3).map(e => ({ k: e.getAttribute('data-row-key'), t: (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40) })) };
  });
  dump('reload-probe', { term, before, after });
});
