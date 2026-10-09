(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const items = [...document.querySelectorAll('[role="menuitem"]')].filter(vis)
    .map(e => {
      const r = e.getBoundingClientRect();
      return { txt: t(e), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    });
  return items;
})()
