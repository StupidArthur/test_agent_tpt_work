(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(vis)[0];
  if (!dlg) return { open: false };
  const btns = [...dlg.querySelectorAll('button')].filter(vis);
  const edits = btns.filter(b => t(b) === '编辑');
  return {
    open: true,
    editCount: edits.length,
    edits: edits.map((b, i) => {
      const r = b.getBoundingClientRect();
      // find the card title above this button
      let card = b.closest('div');
      for (let k = 0; k < 6 && card; k++) {
        card = card.parentElement;
        if (card && /\.(md|json|txt)/i.test(t(card))) break;
      }
      return {
        i,
        x: Math.round(r.x + r.width / 2),
        y: Math.round(r.y + r.height / 2),
        card: t(card).slice(0, 60),
      };
    }),
  };
})()
