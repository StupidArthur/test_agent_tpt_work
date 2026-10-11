import { withApp, dump, sleep } from './lib.mjs';
await withApp(async (page) => {
  const frame = page.frame({ url: /supcon-skills/ });
  const st = await frame.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const cards = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && norm(e.textContent) === '本轮快速回归技能');
    const out = [];
    for (const t of cards) {
      let e = t, chain = [];
      for (let i = 0; i < 7 && e; i++) {
        const attrs = {};
        for (const a of e.attributes || []) attrs[a.name] = a.value.slice(0, 80);
        chain.push({ tag: e.tagName, attrs, text: norm(e.textContent).slice(0, 40) });
        e = e.parentElement;
      }
      out.push(chain);
    }
    // also dump first card outer html once
    const card = cards[0] ? cards[0].closest('[class*="card"],[class*="Card"],[role="listitem"],li,article') : null;
    return { count: cards.length, chains: out, firstCardHtml: card ? card.outerHTML.slice(0, 2500) : null };
  });
  dump('skill-card-dom', st);
});
