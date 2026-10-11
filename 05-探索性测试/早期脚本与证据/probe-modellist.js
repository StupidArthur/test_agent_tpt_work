(() => {
  const vis = e => e.getClientRects().length > 0;
  const txt = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const menus = [...document.querySelectorAll('[role="menu"]')].filter(vis);
  const opts = [...document.querySelectorAll('[role="menuitem"],[role="menuitemradio"],[role="option"]')].filter(vis)
    .map(e => ({ txt: txt(e).slice(0, 50), checked: e.getAttribute('aria-checked'), rect: (r => ({ x: Math.round(r.x), y: Math.round(r.y) }))(e.getBoundingClientRect()) }));
  const labels = [...document.querySelectorAll('*')].filter(vis)
    .filter(e => e.children.length === 0 && /^(ark|TPT|deepseek)$/i.test(txt(e)))
    .map(e => txt(e));
  return { menus: menus.map(m => txt(m).slice(0, 400)), opts, labels: [...new Set(labels)] };
})()
