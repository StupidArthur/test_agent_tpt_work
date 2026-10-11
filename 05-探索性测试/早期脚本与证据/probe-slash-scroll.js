(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const lb = [...document.querySelectorAll('[role="listbox"]')].filter(vis)[0];
  if (!lb) return { found: false };
  // find scrollable container
  let sc = lb;
  for (const c of [lb, ...lb.querySelectorAll('*')]) {
    if (c.scrollHeight > c.clientHeight + 20) { sc = c; break; }
  }
  sc.scrollTop = sc.scrollHeight;
  return { found: true, scrollHeight: sc.scrollHeight, clientHeight: sc.clientHeight, totalOptions: lb.querySelectorAll('[role="option"]').length };
})()
