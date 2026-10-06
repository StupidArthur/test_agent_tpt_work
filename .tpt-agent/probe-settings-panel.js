(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(vis)[0];
  if (!dlg) return { open: false };

  // right-hand content pane: the dialog child that is NOT the nav column
  let pane = null;
  for (const c of dlg.children) {
    if (!vis(c)) continue;
    const r = c.getBoundingClientRect();
    if (r.width > 400) pane = c;
  }
  if (!pane) pane = dlg;

  const controls = [];
  const seen = new Set();

  // native selects
  for (const e of pane.querySelectorAll('select')) {
    if (!vis(e)) continue;
    controls.push({ kind: 'select(native)', label: t(e.closest('div')?.parentElement).slice(0, 60), value: e.value, options: [...e.options].map(o => o.text) });
  }
  // switch-like
  for (const e of pane.querySelectorAll('[role="switch"],input[type="checkbox"]')) {
    if (!vis(e)) continue;
    const row = e.closest('div')?.parentElement;
    controls.push({ kind: 'switch', label: t(row).slice(0, 80), state: e.getAttribute('aria-checked') ?? e.checked });
  }
  // radio / option cards
  for (const e of pane.querySelectorAll('[role="radio"],[data-state="checked"],[data-state="on"]')) {
    if (!vis(e)) continue;
    const r = e.getBoundingClientRect();
    const key = 'r' + Math.round(r.x) + '_' + Math.round(r.y);
    if (seen.has(key)) continue;
    seen.add(key);
    controls.push({ kind: 'radio/card', label: t(e).slice(0, 60), state: e.getAttribute('data-state'), aria: e.getAttribute('aria-checked') });
  }
  // number inputs / sliders
  for (const e of pane.querySelectorAll('input[type="number"],input[type="range"],input:not([type])')) {
    if (!vis(e)) continue;
    const row = e.closest('div')?.parentElement;
    controls.push({ kind: 'input', label: t(row).slice(0, 80), value: e.value, placeholder: e.placeholder || '' });
  }
  // buttons (actionable, excluding pure nav)
  for (const e of pane.querySelectorAll('button')) {
    if (!vis(e)) continue;
    const label = t(e);
    if (!label) continue;
    if (label === '关闭') continue;
    const key = 'b' + label;
    if (seen.has(key)) continue;
    seen.add(key);
    controls.push({ kind: 'button', label: label.slice(0, 50) });
  }

  return {
    open: true,
    section: t(pane).slice(0, 1200),
    headings: [...pane.querySelectorAll('h1,h2,h3,h4,[class*="title"],[class*="Title"]')].filter(vis).map(e => t(e)).filter(Boolean).slice(0, 20),
    controls,
  };
})()
