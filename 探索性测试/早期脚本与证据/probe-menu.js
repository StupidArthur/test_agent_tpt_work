(() => {
  const vis = e => e.getClientRects().length > 0;
  const roles = ['menu', 'menuitem', 'menuitemradio', 'option', 'listbox', 'dialog'];
  const out = [];
  for (const r of roles) {
    for (const e of document.querySelectorAll('[role="' + r + '"]')) {
      if (!vis(e)) continue;
      const rc = e.getBoundingClientRect();
      out.push({
        role: r,
        txt: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200),
        rect: { x: Math.round(rc.x), y: Math.round(rc.y), w: Math.round(rc.width), h: Math.round(rc.height) },
        checked: e.getAttribute('aria-checked'),
        disabled: e.getAttribute('aria-disabled'),
      });
    }
  }
  return out;
})()
