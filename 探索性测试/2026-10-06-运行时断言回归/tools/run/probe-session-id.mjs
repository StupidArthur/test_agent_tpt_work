import { withApp, dump } from './lib.mjs';
await withApp(async (page) => {
  const st = await page.evaluate(() => {
    const keys = [...document.querySelectorAll('[data-row-key]')].map(e => ({ k: e.getAttribute('data-row-key'), cls: (e.className || '').toString().slice(0, 60), sel: e.getAttribute('aria-selected') }));
    const sessionRows = keys.filter(k => /session/i.test(k.k)).slice(0, 5);
    const attrs = {};
    document.querySelectorAll('*').forEach(e => { for (const a of e.attributes || []) if (/session.*id|data-session|data-task/i.test(a.name)) { if (!attrs[a.name]) attrs[a.name] = []; if (attrs[a.name].length < 3) attrs[a.name].push(a.value); } });
    return { keysSample: keys.slice(0, 3), sessionRows, sessionAttrs: attrs };
  });
  dump('session-id-probe', st);
});
