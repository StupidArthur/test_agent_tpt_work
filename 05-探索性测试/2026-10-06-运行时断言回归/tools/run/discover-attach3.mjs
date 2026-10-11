import { withApp, dump } from './lib.mjs';
await withApp(async (page) => {
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const leaf = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && norm(e.textContent) === 'attachment-a.txt');
    if (!leaf) return { found: false, body: norm(document.body.innerText).slice(-600) };
    const chain = [];
    let e = leaf;
    for (let i = 0; i < 8 && e; i++) { const r = e.getBoundingClientRect(); chain.push({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 60), slot: e.getAttribute('data-slot'), title: e.getAttribute('title'), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }); e = e.parentElement; }
    const container = leaf.closest('[class*="attach"],[class*="Attach"],[class*="file"],[class*="File"],[data-slot]');
    return { found: true, chain, containerHtml: container ? container.outerHTML.slice(0, 2500) : null };
  });
  dump('attach-dom', st);
});
