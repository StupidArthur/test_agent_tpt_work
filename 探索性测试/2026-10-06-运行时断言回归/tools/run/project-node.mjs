import { withApp, dump } from './lib.mjs';

await withApp(async (page) => {
  const info = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find(e => e.textContent && e.textContent.trim() === 'tpt-workspace' && e.children.length === 0);
    if (!el) return { found: false };
    const chain = [];
    let e = el;
    for (let i = 0; i < 6 && e; i++) {
      const attrs = {};
      for (const a of e.attributes || []) attrs[a.name] = a.value.slice(0, 120);
      chain.push({ tag: e.tagName, attrs, text: (e.textContent || '').trim().slice(0, 60) });
      e = e.parentElement;
    }
    return { found: true, chain };
  });
  dump('project-node', info);
});
