(() => {
  // Settings dialog left-nav items. Returns ASCII-only coords so PowerShell can parse.
  const vis = e => e.getClientRects().length > 0;
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(vis)[0];
  if (!dlg) return { open: false };
  const cands = [...dlg.querySelectorAll('button,[role="button"],[role="tab"],a')]
    .filter(vis)
    .map(e => {
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width) };
    })
    .filter(c => c.w > 60 && c.w < 220)
    .sort((a, b) => a.y - b.y);
  // dedupe by y
  const items = [];
  for (const c of cands) {
    if (!items.some(i => Math.abs(i.y - c.y) < 6)) items.push(c);
  }
  return { open: true, count: items.length, items };
})()
