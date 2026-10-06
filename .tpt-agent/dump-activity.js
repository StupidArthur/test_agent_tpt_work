(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(vis)[0];
  let sec = null;
  for (const el of dlg.querySelectorAll('*')) {
    const s = t(el);
    if (s.startsWith('近期动态') && s.length > 30 && el.children.length < 12) sec = el;
  }
  return sec ? t(sec) : 'NOT FOUND';
})()
