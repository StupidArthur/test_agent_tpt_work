(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const out = [];
  const roles = ['listbox', 'option', 'menu', 'menuitem', 'dialog', 'tooltip', 'status'];
  for (const r of roles) {
    for (const e of document.querySelectorAll('[role="' + r + '"]')) {
      if (!vis(e)) continue;
      const rc = e.getBoundingClientRect();
      out.push({ role: r, txt: t(e).slice(0, 300), y: Math.round(rc.y), h: Math.round(rc.height) });
    }
  }
  // fallback: any absolutely positioned popup container
  const pops = [...document.querySelectorAll('[data-radix-popper-content-wrapper], [class*="popover"], [class*="Popover"], [class*="suggest"], [class*="Suggest"], [class*="mention"], [class*="Mention"]')]
    .filter(vis).map(e => ({ cls: ('' + e.className).slice(0, 50), txt: t(e).slice(0, 200) }));
  return { roleItems: out, popups: pops };
})()
