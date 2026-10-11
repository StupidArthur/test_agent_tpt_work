(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(vis)[0];
  if (!dlg) return { open: false };
  const lbl = [...dlg.querySelectorAll('*')].filter(vis)
    .find(e => e.children.length === 0 && t(e) === '工厂模式');
  if (!lbl) return { found: false };
  let card = lbl;
  for (let i = 0; i < 8 && card; i++) {
    card = card.parentElement;
    if (card && t(card).length > 80) break;
  }
  const links = [...card.querySelectorAll('button,a,[role="button"],summary')]
    .filter(vis)
    .map(e => {
      const r = e.getBoundingClientRect();
      return { txt: t(e) || '(icon-only)', x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    });
  return { found: true, cardText: t(card).slice(0, 200), links };
})()
