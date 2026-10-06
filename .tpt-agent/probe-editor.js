(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const ds = [...document.querySelectorAll('[role="dialog"]')].filter(vis);
  if (!ds.length) return { open: false };
  const d = ds[ds.length - 1];
  const ta = d.querySelector('textarea');
  const m = t(d).match(/[A-Za-z]:\\[^\s]+\.(md|json|txt)/);
  return {
    open: true,
    title: t(d.querySelector('h1,h2,h3') || d).slice(0, 40),
    path: m ? m[0] : null,
    value: ta ? ta.value : null,
    len: ta ? ta.value.length : 0,
    buttons: [...d.querySelectorAll('button')].filter(vis).map(b => t(b)).filter(Boolean),
  };
})()
