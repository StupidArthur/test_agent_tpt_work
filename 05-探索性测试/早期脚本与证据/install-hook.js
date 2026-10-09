(() => {
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
  const hook = { added: [], errors: [], warns: [] };
  window.__tptHook = hook;
  try {
    const oe = console.error.bind(console);
    console.error = (...a) => { hook.errors.push(a.map(x => { try { return typeof x === 'string' ? x : JSON.stringify(x); } catch { return String(x); } }).join(' ').slice(0, 300)); oe(...a); };
    const ow = console.warn.bind(console);
    console.warn = (...a) => { hook.warns.push(a.map(String).join(' ').slice(0, 300)); ow(...a); };
  } catch (e) { hook.errors.push('hook-fail ' + e.message); }
  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        const txt = norm(n.innerText);
        if (txt) hook.added.push({ t: Date.now(), txt: txt.slice(0, 160), role: n.getAttribute('role') || '', cls: (n.className || '').toString().slice(0, 60) });
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
  window.__tptHookStop = () => mo.disconnect();
  return 'hooked';
})()
