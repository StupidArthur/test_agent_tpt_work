(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(vis)[0];
  if (!dlg) return { open: false };

  // find preset cards: elements whose text contains a known preset name and many children
  const names = ['标准模式', 'PTC 模式', '极简模式', '创造模式', '工厂模式'];
  const cards = [];
  for (const n of names) {
    // locate the header text node then walk up to a card-sized container
    const label = [...dlg.querySelectorAll('*')].filter(vis)
      .find(e => e.children.length === 0 && t(e) === n);
    if (!label) { cards.push({ name: n, found: false }); continue; }
    let card = label;
    for (let i = 0; i < 8 && card; i++) {
      card = card.parentElement;
      if (card && t(card).length > 120) break;
    }
    const links = [...card.querySelectorAll('button,a,[role=button],[role=link],summary')]
      .filter(vis)
      .map(e => {
        const r = e.getBoundingClientRect();
        return { txt: t(e).slice(0, 20), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
      })
      .filter(l => l.txt);
    const cr = card.getBoundingClientRect();
    cards.push({ name: n, found: true, links, rect: { x: Math.round(cr.x), y: Math.round(cr.y), w: Math.round(cr.width), h: Math.round(cr.height) } });
  }
  return { open: true, cards };
})()
