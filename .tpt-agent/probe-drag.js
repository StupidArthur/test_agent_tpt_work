(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const rows = [...document.querySelectorAll('[data-tpt-region-row]')].filter(vis);
  const before = rows.map(r => ({ txt: t(r).slice(0, 22), key: r.getAttribute('data-tpt-region-row'), draggable: r.getAttribute('draggable') }));
  if (rows.length < 2) return { error: 'need >=2 rows', before };

  const [a, b] = rows;
  const dt = (() => { try { return new DataTransfer(); } catch (e) { return null; } })();
  const fire = (el, type, extra = {}) => {
    const ev = new DragEvent(type, Object.assign({ bubbles: true, cancelable: true, dataTransfer: dt, composed: true }, extra));
    return el.dispatchEvent(ev);
  };
  const results = {};
  results.dragstart = fire(a, 'dragstart');
  results.dragenter = fire(b, 'dragenter');
  results.dragover = fire(b, 'dragover');
  results.drop = fire(b, 'drop');
  results.dragend = fire(a, 'dragend');

  const after = [...document.querySelectorAll('[data-tpt-region-row]')].filter(vis).map(r => t(r).slice(0, 22));
  let reg = null; try { reg = JSON.parse(localStorage.getItem('tpt.sidebar.regions')); } catch (e) { }
  return { before, after, dispatchReturned: results, orderBy: reg ? reg.orderBy : null, recentOrderLen: reg && reg.recentOrder ? reg.recentOrder.length : null };
})()
