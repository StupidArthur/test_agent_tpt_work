// Minimal CDP client for the TPT Work Electron app (no Playwright needed).
// Usage: node cdp.mjs <command> [args...]
//   list                 list CDP targets
//   text [maxChars]      print visible-ish body innerText
//   html <selector>      print outerHTML of first match
//   shot <file>          capture screenshot to file (png)
//   eval <expr>          evaluate JS expression in page, print JSON result
//   evalfile <path>      evaluate JS source file content in page
//   clicktext <text>     real mouse click on first visible element containing text
//   clickat <x> <y>      real mouse click at viewport coords
//   type <text>          insertText into focused element (after focus <sel>)
//   focus <selector>     focus first match of selector
//   key <KeyName>        press a key (Enter, Tab, Escape, ...)
import fs from 'node:fs';

const PORT = process.env.TPT_CDP_PORT ?? '9234';
const BASE = `http://127.0.0.1:${PORT}`;

async function targets() {
  const r = await fetch(`${BASE}/json/list`);
  return r.json();
}

async function pageTarget() {
  const list = await targets();
  return (
    list.find(t => t.type === 'page' && String(t.url).startsWith('dsh-app://')) ??
    list.find(t => t.type === 'webview') ??
    list.find(t => t.type === 'page')
  );
}

async function connect() {
  const t = await pageTarget();
  if (!t) throw new Error('no page target found');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = e => rej(new Error('ws error: ' + (e?.message ?? 'unknown')));
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = ev => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  return { send, target: t, close: () => ws.close() };
}

async function evaluate(send, expression) {
  const r = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  });
  if (r.exceptionDetails) {
    const d = r.exceptionDetails;
    throw new Error('page exception: ' + (d.exception?.description ?? d.text ?? JSON.stringify(d)));
  }
  return r.result?.value;
}

const cmd = process.argv[2];

async function clickAt(send, x, y) {
  await send('Page.bringToFront').catch(() => {});
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
}

async function findCenter(send, needle) {
  return evaluate(
    send,
    `(() => {
      const vis = e => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
      const needle = ${JSON.stringify(needle)};
      const all = [...document.querySelectorAll('button,[role=button],a,li,[role=menuitem],[role=option],[data-slot],div,span')].filter(vis);
      const matches = all.filter(e => (e.innerText || '').replace(/\\s+/g, ' ').trim().includes(needle));
      if (!matches.length) return null;
      matches.sort((a, b) => (a.innerText.length - b.innerText.length) || (a.querySelectorAll('*').length - b.querySelectorAll('*').length));
      const el = matches[0];
      const rc = el.getBoundingClientRect();
      return { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2, tag: el.tagName, txt: (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 60) };
    })()`
  );
}
const c = await connect();
try {
  if (cmd === 'list') {
    console.log(JSON.stringify(await targets(), null, 2));
  } else if (cmd === 'text') {
    const max = Number(process.argv[3] ?? 4000);
    const txt = await evaluate(c.send, 'document.body ? document.body.innerText : ""');
    console.log(String(txt).slice(0, max));
  } else if (cmd === 'html') {
    const sel = process.argv[3] ?? 'body';
    const out = await evaluate(
      c.send,
      `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return e ? e.outerHTML : null; })()`
    );
    console.log(out === null ? '<<no match>>' : String(out).slice(0, 20000));
  } else if (cmd === 'shot') {
    const file = process.argv[3] ?? 'shot.png';
    const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    console.log('saved: ' + file);
  } else if (cmd === 'eval') {
    const out = await evaluate(c.send, process.argv.slice(3).join(' '));
    console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 2));
  } else if (cmd === 'evalfile') {
    const src = fs.readFileSync(process.argv[3], 'utf8');
    const out = await evaluate(c.send, src);
    console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 2));
  } else if (cmd === 'send') {
    const text = process.argv.slice(3).join(' ');
    const box = await evaluate(c.send, `(() => { const e=document.querySelector('div[contenteditable=true]'); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; })()`);
    if (!box) throw new Error('composer not found');
    await clickAt(c.send, box.x, box.y);
    await c.send('Input.insertText', { text });
    await new Promise(r => setTimeout(r, 300));
    const sb = await evaluate(c.send, `(() => { const b=document.querySelector('button.uV2eYG_primary'); if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2, disabled:b.disabled}; })()`);
    if (!sb || sb.disabled) throw new Error('send button unavailable: ' + JSON.stringify(sb));
    await clickAt(c.send, sb.x, sb.y);
    console.log('sent: ' + text.slice(0, 80));
  } else if (cmd === 'wait') {
    const timeout = Number(process.argv[3] ?? 180) * 1000;
    const start = Date.now();
    for (;;) {
      await new Promise(r => setTimeout(r, 4000));
      const st = await evaluate(c.send, `(() => { const t=document.body.innerText; const h=s=>t.includes(s); return { busy: h('\\u63a2\\u7d22\\u4e2d')||h('\\u8fdb\\u884c\\u4e2d')||h('\\u6df1\\u5ea6\\u6c42\\u7d22\\u4e2d'), stop: [...document.querySelectorAll('button')].some(b=>b.innerText.includes('\\u505c\\u6b62')) }; })()`);
      console.log(new Date().toISOString().slice(11, 19) + ` busy=${st.busy} stop=${st.stop}`);
      if (!st.busy && !st.stop) break;
      if (Date.now() - start > timeout) { console.log('TIMEOUT'); process.exitCode = 1; break; }
    }
  } else if (cmd === 'close') {
    try {
      await c.send('Browser.close');
      console.log('Browser.close sent');
    } catch (e) {
      console.log('Browser.close failed: ' + e.message);
    }
  } else if (cmd === 'clear') {
    const sel = process.argv[3] || 'div[contenteditable=true]';
    await evaluate(c.send, `(() => { const e=document.querySelector(${JSON.stringify(sel)}); if(e) e.focus(); return true; })()`);
    // Ctrl+A then Backspace via real key events
    await c.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 2, windowsVirtualKeyCode: 65, code: 'KeyA', key: 'a' });
    await c.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 2, windowsVirtualKeyCode: 65, code: 'KeyA', key: 'a' });
    await new Promise(r => setTimeout(r, 120));
    await c.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 8, code: 'Backspace', key: 'Backspace' });
    await c.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 8, code: 'Backspace', key: 'Backspace' });
    await new Promise(r => setTimeout(r, 200));
    const left = await evaluate(c.send, `(() => { const e=document.querySelector(${JSON.stringify(sel)}); return e ? e.innerText : null; })()`);
    console.log('cleared, remaining=' + JSON.stringify(left));
  } else if (cmd === 'move') {
    const x = Number(process.argv[3]);
    const y = Number(process.argv[4]);
    await c.send('Page.bringToFront').catch(() => {});
    await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
    console.log(`moved to ${x},${y}`);
  } else if (cmd === 'clickat') {
    const x = Number(process.argv[3]);
    const y = Number(process.argv[4]);
    await clickAt(c.send, x, y);
    console.log(`clicked at ${x},${y}`);
  } else if (cmd === 'clicktext') {
    const needle = process.argv.slice(3).join(' ');
    const hit = await findCenter(c.send, needle);
    if (!hit) { console.log('NOT FOUND: ' + needle); process.exitCode = 1; }
    else { await clickAt(c.send, hit.x, hit.y); console.log(`clicked [${hit.tag}] "${hit.txt}" @ ${Math.round(hit.x)},${Math.round(hit.y)}`); }
  } else if (cmd === 'dblclickat') {
    const x = Number(process.argv[3]);
    const y = Number(process.argv[4]);
    await c.send('Page.bringToFront').catch(() => {});
    await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
    await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
    await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
    await new Promise(r => setTimeout(r, 60));
    await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 2 });
    await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 2 });
    console.log(`double-clicked at ${x},${y}`);
  } else if (cmd === 'clickaria') {
    const needle = process.argv.slice(3).join(' ');
    const hit = await evaluate(c.send, `(() => {
      const vis = e => e.getClientRects().length > 0;
      const els = [...document.querySelectorAll('[aria-label]')].filter(vis);
      const m = els.filter(e => (e.getAttribute('aria-label') || '').includes(${JSON.stringify(needle)}));
      if (!m.length) return null;
      const el = m[0];
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, aria: el.getAttribute('aria-label'), tag: el.tagName, dis: el.disabled === true || el.getAttribute('aria-disabled') === 'true' };
    })()`);
    if (!hit) { console.log('NOT FOUND(aria): ' + needle); process.exitCode = 1; }
    else { await clickAt(c.send, hit.x, hit.y); console.log('clicked aria[' + hit.tag + (hit.dis ? ' DISABLED' : '') + '] "' + hit.aria.slice(0, 46) + '" @ ' + Math.round(hit.x) + ',' + Math.round(hit.y)); }
  } else if (cmd === 'probe-aria') {
    const needle = process.argv.slice(3).join(' ');
    const hit = await evaluate(c.send, `(() => {
      const vis = e => e.getClientRects().length > 0;
      return [...document.querySelectorAll('[aria-label]')].filter(e => (e.getAttribute('aria-label') || '').includes(${JSON.stringify(needle)}))
        .map(e => { const r = e.getBoundingClientRect(); return { vis: vis(e), tag: e.tagName, aria: e.getAttribute('aria-label'), x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }; });
    })()`);
    console.log(JSON.stringify(hit, null, 2));
  } else if (cmd === 'focus') {
    const sel = process.argv[3];
    const ok = await evaluate(c.send, `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if(!e) return false; e.focus(); return document.activeElement === e; })()`);
    console.log('focus: ' + ok);
  } else if (cmd === 'type') {
    await c.send('Input.insertText', { text: process.argv.slice(3).join(' ') });
    console.log('typed ' + (process.argv.slice(3).join(' ')).length + ' chars');
  } else if (cmd === 'key') {
    const k = process.argv[3];
    const map = { Enter: [13, 'Enter'], Tab: [9, 'Tab'], Escape: [27, 'Escape'] };
    const [vk, code] = map[k] ?? [0, k];
    await c.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, code, key: k });
    await c.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, code, key: k });
    console.log('key ' + k);
  } else {
    console.log('unknown command: ' + cmd);
    process.exitCode = 2;
  }
} finally {
  c.close();
}
