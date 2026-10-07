(() => {
  const vis = e => e.getClientRects().length > 0;
  const items = [...document.querySelectorAll('[role="menuitem"]')].filter(vis)
    .map(e => {
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    });
  return { count: items.length, items };
})()
