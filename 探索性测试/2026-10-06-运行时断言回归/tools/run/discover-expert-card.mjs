import { withApp, dump, sleep, expertsFrame } from './lib.mjs';
await withApp(async (page) => {
  const f = await expertsFrame(page);
  const st = await f.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const t = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && norm(e.textContent) === '本轮快速回归专家');
    if (!t) return { found: false };
    const chain = [];
    let e = t;
    for (let i = 0; i < 7 && e; i++) { chain.push({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 70), slot: e.getAttribute('data-slot') }); e = e.parentElement; }
    return { found: true, chain };
  });
  dump('expert-card-dom', st);
});
