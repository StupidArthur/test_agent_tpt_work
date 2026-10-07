(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const out = [];
  const roles = ['menu', 'menuitem', 'menuitemradio', 'option', 'listbox'];
  for (const r of roles) {
    const sel = '[role="' + r + '"]';
    for (const e of document.querySelectorAll(sel)) {
      if (!vis(e)) continue;
      out.push({
        role: r,
        txt: t(e).slice(0, 90),
        checked: e.getAttribute('aria-checked') || e.getAttribute('data-state') || '',
        y: Math.round(e.getBoundingClientRect().y),
      });
    }
  }
  // also catch plain text leaves that look like model names (custom listbox without roles)
  const leaves = [...document.querySelectorAll('div,span,li')]
    .filter(e => vis(e) && e.children.length === 0)
    .map(e => t(e))
    .filter(s => s && s.length < 40 && /[A-Za-z]/.test(s) && /deepseek|flash|glm|ark|标准|高级|轻量|pro|vision|exp/i.test(s));
  return { roles: out, textLeaves: [...new Set(leaves)] };
})()
