(() => {
  const vis = e => e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const rows = () => [...document.querySelectorAll('[data-tpt-region-row]')].filter(vis);
  const before = rows().map(r => t(r).slice(0, 20));
  const list = rows();
  if (list.length < 2) return { error: 'need >=2 rows', before };

  const src = list[list.length - 1];   // 最后一行
  const dst = list[0];                 // 第一行
  const dt = (() => { try { return new DataTransfer(); } catch (e) { return null; } })();
  const fire = (el, type, extra = {}) => el.dispatchEvent(new DragEvent(type, Object.assign({ bubbles: true, cancelable: true, dataTransfer: dt, composed: true }, extra)));

  const log = [];
  const rect = dst.getBoundingClientRect();
  const topThird = rect.top + rect.height / 3;
  const mid = { clientX: rect.left + rect.width / 2, clientY: topThird };
  for (const [el, type, extra] of [
    [src, 'dragstart', {}],
    [dst, 'dragenter', mid],
    [dst, 'dragover', mid],
    [dst, 'drop', mid],
    [src, 'dragend', {}],
  ]) {
    log.push(type + '=' + fire(el, type, extra));
  }
  return { before, after: rows().map(r => t(r).slice(0, 20)), dispatchReturned: log };
})()
