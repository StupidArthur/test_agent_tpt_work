(() => {
  const net = { calls: [] };
  window.__netHook = net;
  const of = window.fetch;
  window.fetch = function (...a) {
    let u = '';
    try { u = typeof a[0] === 'string' ? a[0] : (a[0] && a[0].url) || ''; } catch { }
    net.calls.push({ kind: 'fetch', url: String(u).slice(0, 160), t: Date.now() });
    return of.apply(this, a).then(r => { net.calls.push({ kind: 'fetch-ok', url: String(u).slice(0, 80), status: r.status, t: Date.now() }); return r; },
      e => { net.calls.push({ kind: 'fetch-err', url: String(u).slice(0, 80), err: String(e && e.message || e).slice(0, 120), t: Date.now() }); throw e; });
  };
  const OX = window.XMLHttpRequest;
  function Patched() {
    const x = new OX();
    const oo = x.open;
    x.open = function (m, u, ...r) { net.calls.push({ kind: 'xhr', m, url: String(u).slice(0, 160), t: Date.now() }); return oo.call(x, m, u, ...r); };
    return x;
  }
  Patched.prototype = OX.prototype;
  window.XMLHttpRequest = Patched;
  const ows = window.WebSocket;
  window.WebSocket = function (...a) { net.calls.push({ kind: 'ws', url: String(a[0]).slice(0, 120), t: Date.now() }); return new ows(...a); };
  window.WebSocket.prototype = ows.prototype;
  for (const k of ['OPEN', 'CLOSED', 'CONNECTING', 'CLOSING']) window.WebSocket[k] = ows[k];
  return 'net-hooked';
})()
