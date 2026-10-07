(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(vis)[0];
  let sec = null;
  for (const el of dlg.querySelectorAll('*')) {
    const s = t(el);
    if (s.startsWith('近期动态') && s.length > 30 && el.children.length < 12) sec = el;
  }
  if (!sec) return { found: false };

  // A row = element whose OWN text starts with "<time>前 <type>"
  const rows = [...sec.querySelectorAll('*')].filter(vis)
    .map(e => t(e))
    .filter(s => /^\S+前\s(写入|反思)/.test(s));

  // dedupe keeping the most complete (longest) per time+type key
  const byKey = new Map();
  for (const s of rows) {
    const m = s.match(/^(\S+前)\s(写入|反思)(\s·\s\S+)?/);
    if (!m) continue;
    const key = m[1] + '|' + m[2] + '|' + (m[3] || '');
    if (!byKey.has(key) || byKey.get(key).length < s.length) byKey.set(key, s);
  }
  const uniq = [...byKey.entries()].map(([k, v]) => v);

  const writes = uniq.filter(s => /\s写入(\s|$)/.test(s));
  const reflDone = uniq.filter(s => /反思完成/.test(s));
  const reflNo = uniq.filter(s => /无需升格/.test(s));

  return {
    found: true,
    totalRows: uniq.length,
    writes: writes.length,
    reflDone: reflDone.length,
    reflNoPromote: reflNo.length,
    sampleDone: reflDone.map(s => s.slice(0, 120)),
    summaryLine: t(sec).slice(0, 50),
  };
})()
