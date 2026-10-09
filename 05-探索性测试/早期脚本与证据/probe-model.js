(() => {
  const vis = e => e.getClientRects().length > 0;
  const out = [...document.querySelectorAll('[class*="7KE1Ra"]')].filter(vis).map(e => {
    const r = e.getBoundingClientRect();
    return {
      tag: e.tagName,
      cls: ('' + e.className).slice(0, 60),
      txt: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      role: e.getAttribute('role') || '',
      expanded: e.getAttribute('aria-expanded'),
    };
  });
  return out;
})()
