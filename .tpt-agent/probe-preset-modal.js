(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const ds = [...document.querySelectorAll('[role="dialog"]')].filter(vis);
  if (ds.length < 2) return { modal: false };
  const m = ds[ds.length - 1];
  // tab buttons inside the modal
  const tabs = [...m.querySelectorAll('button')].filter(vis)
    .map(b => {
      const r = b.getBoundingClientRect();
      return { txt: t(b), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    })
    .filter(b => b.txt);
  return { modal: true, title: t(m.querySelector('h1,h2,h3') || m).slice(0, 30), tabs, full: t(m) };
})()
