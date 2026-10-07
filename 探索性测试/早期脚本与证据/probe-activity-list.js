(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(vis)[0];
  if (!dlg) return { open: false };

  // find the element whose text starts with 近期动态 -> climb to the section card
  let sec = null;
  for (const el of dlg.querySelectorAll('*')) {
    const s = t(el);
    if (s.startsWith('近期动态') && s.length > 30 && el.children.length < 12) { sec = el; }
  }
  if (!sec) return { open: true, sec: false };

  // find scrollable descendant
  let sc = null;
  for (const c of sec.querySelectorAll('*')) {
    if (c.scrollHeight > c.clientHeight + 20 && c.clientHeight > 60) { sc = c; }
  }
  const info = {
    open: true,
    secFound: true,
    scrollable: !!sc,
    scrollHeight: sc ? sc.scrollHeight : null,
    clientHeight: sc ? sc.clientHeight : null,
    fullText: t(sec).length,
  };
  if (sc) { sc.scrollTop = sc.scrollHeight; }
  return info;
})()
