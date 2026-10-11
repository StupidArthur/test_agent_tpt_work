(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(vis)[0];
  if (!dlg) return { open: false };
  let pane = null;
  for (const c of dlg.children) {
    if (!vis(c)) continue;
    const r = c.getBoundingClientRect();
    if (r.width > 400) pane = c;
  }
  if (!pane) return { open: true, pane: false };

  const rows = [];
  const inputs = [...pane.querySelectorAll('input')].filter(vis);
  for (const inp of inputs) {
    // climb to the row container that holds the label
    let row = inp;
    for (let i = 0; i < 5 && row; i++) {
      row = row.parentElement;
      if (row && t(row).length > 0) break;
    }
    rows.push({
      type: inp.type || 'text',
      value: inp.value,
      min: inp.min !== '' ? inp.min : null,
      max: inp.max !== '' ? inp.max : null,
      step: inp.step !== '' ? inp.step : null,
      rowText: t(row).slice(0, 90),
    });
  }

  // switches with their own label
  const sw = [...pane.querySelectorAll('[role="switch"],input[type="checkbox"]')].filter(vis)
    .map(e => {
      let row = e;
      for (let i = 0; i < 5 && row; i++) { row = row.parentElement; if (row && t(row).length > 0) break; }
      return { on: e.getAttribute('aria-checked') ?? e.checked, rowText: t(row).slice(0, 90) };
    });

  // plain action buttons
  const btns = [...pane.querySelectorAll('button')].filter(vis).map(e => t(e)).filter(Boolean);

  return { open: true, count: inputs.length, rows, switches: sw, buttons: [...new Set(btns)] };
})()
