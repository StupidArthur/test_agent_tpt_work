(() => {
  const vis = e => e.getClientRects().length > 0;
  const txt = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const out = [];
  for (const e of document.querySelectorAll('button,[role="button"]')) {
    if (!vis(e)) continue;
    const r = e.getBoundingClientRect();
    // left sidebar, bottom area
    if (r.x < 300 && r.y > 700) {
      out.push({
        tag: e.tagName,
        txt: txt(e).slice(0, 40),
        cls: ('' + e.className).slice(0, 50),
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        center: { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) },
        aria: e.getAttribute('aria-label') || e.getAttribute('aria-haspopup') || '',
      });
    }
  }
  return out;
})()
