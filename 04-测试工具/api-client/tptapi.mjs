#!/usr/bin/env node
/**
 * tptapi — TPT Work 本地宿主接口（Typert Gateway）命令行客户端。
 *
 * 用途：不经 UI，直接调用正在运行的 TPT Work 实例的本地宿主接口：
 *   一元调用 POST /api/<endpoint>、命令/权限切换、会话对话与结果回收、审批应答。
 *
 * 鉴权：宿主使用 cookie 会话。本工具从实例的 CDP 端点读取该实例自身的
 *   `dsh-auth-*` cookie（GET /?token=<launch token> 之后由渲染进程持有），
 *   因此不需要知道启动 token，也不改动实例状态。**只对本机回环宿主使用**，
 *   --host/--cdp 非回环输入会被直接拒绝。
 *
 * 依赖：Node.js >= 18（使用全局 fetch）。WebSocket 用内置 http 手动升级（零第三方依赖），
 *   以便携带 Cookie 头并完全控制总期限与关闭行为。
 *
 * 退出码：0 成功；1 用法/HTTP/协议/传输错误；2 业务 ok:false；3 approve 未达 requested。
 *
 * 边界：本工具直接操作产品数据根，会真实创建/修改会话与设置；只应在授权实例上使用。
 *   它不替代 UI 断言，也不负责环境检测与进程/实例绑定（见 04-测试工具/README.md）。
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.cache');
const COOKIE_FILE = path.join(CACHE_DIR, 'cookie.txt');
const CACHE_VERSION = 3;

const DEFAULT_HOST = 'http://127.0.0.1:21029';
const DEFAULT_CDP = 'http://127.0.0.1:9234';
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const PERMISSION_PRESETS = new Set(['read-only', 'workspace-write', 'danger-full-access', 'auto']);
const APPROVAL_DECISIONS = new Set(['allowed-once', 'rejected', 'cancelled']);
const PROMPT_MODES = new Set(['queue', 'steer']);

const VALUE_OPTS = new Set([
  'host', 'cdp', 'cookie', 'cookie-file', 'instance', 'args', 'args-file', 'timeout', 'attempt-ms', 'count',
  'filter', 'workspaceId', 'cwd', 'preset', 'mode', 'tz', 'text', 'requestId', 'throughSeq', 'beforeSeq', 'max',
]);
const FLAG_OPTS = new Set(['pretty', 'help']);

// ---------------- 错误 ----------------
class CliError extends Error {
  constructor(kind, message, { exit = 1, ...meta } = {}) {
    super(message);
    this.name = 'CliError';
    this.kind = kind;      // usage|http|protocol|transport|timeout|business|cdp|internal
    this.exit = exit;
    this.meta = meta;
  }
}
const usage = (msg) => { throw new CliError('usage', msg, { exit: 1 }); };

function reportError(e) {
  if (e instanceof CliError) {
    console.error(JSON.stringify({ error: { kind: e.kind, message: e.message, ...e.meta } }));
    process.exitCode = e.exit ?? 1;
  } else {
    console.error(JSON.stringify({ error: { kind: 'internal', message: String((e && e.message) || e) } }));
    process.exitCode = 1;
  }
}
process.on('unhandledRejection', (e) => { reportError(e); process.exit(process.exitCode || 1); });
process.on('uncaughtException', (e) => { reportError(e); process.exit(process.exitCode || 1); });

// ---------------- 参数解析 ----------------
function parseArgv(argv) {
  const pos = [];
  const opt = {};
  const errors = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (typeof a !== 'string' || !a.startsWith('--')) { pos.push(a); continue; }
    const eq = a.indexOf('=');
    const name = eq >= 0 ? a.slice(2, eq) : a.slice(2);
    const inline = eq >= 0 ? a.slice(eq + 1) : undefined;
    if (name === 'any') { errors.push('--any 已移除：仅支持指定 session 的审批（--any / --any false 均不再接受）'); continue; }
    if (FLAG_OPTS.has(name)) {
      if (inline !== undefined) errors.push(`--${name} 是布尔标志，不接受取值`);
      else opt[name] = true;
      continue;
    }
    if (!VALUE_OPTS.has(name)) { errors.push(`未知参数 --${name}`); continue; }
    if (inline !== undefined) { opt[name] = inline; continue; }
    const next = argv[i + 1];
    if (next === undefined || (typeof next === 'string' && next.startsWith('--'))) { errors.push(`--${name} 缺少取值`); continue; }
    opt[name] = next; i++;
  }
  return { pos, opt, errors };
}

/** 读取一个必须是整数的选项；min/max 之外或非法文本一律用法错误。 */
function intOpt(opt, name, { def, min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (opt[name] === undefined) {
    if (def !== undefined) return def;
    return undefined;
  }
  const raw = opt[name];
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) usage(`--${name} 必须是整数，收到 ${JSON.stringify(raw)}`);
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) usage(`--${name} 超出允许范围 [${min}, ${max}]，收到 ${raw}`);
  return n;
}

function loopbackHost(host) {
  const h = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
  if (h === 'localhost' || h === '::1') return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  return !!m && m[1] === '127' && [m[2], m[3], m[4]].every((x) => Number(x) <= 255);
}

/** 规范化并限制为回环 http origin；禁止凭据、路径、query/hash、https。
 * 本产品宿主为本地 HTTP；HTTPS/WSS 不支持，统一在发请求前拒绝（见 README）。 */
function normalizeEndpoint(raw, name) {
  let u;
  try { u = new URL(String(raw)); } catch { usage(`${name} 不是合法 URL: ${raw}`); }
  if (u.protocol !== 'http:') usage(`${name} 只支持 http（本工具不支持 https/wss），收到 ${raw}`);
  if (u.username || u.password) usage(`${name} 不允许携带凭据: ${raw}`);
  if (u.search || u.hash) usage(`${name} 不允许 query/hash: ${raw}`);
  if (u.pathname !== '/' && u.pathname !== '') usage(`${name} 不允许路径: ${u.pathname}`);
  if (!loopbackHost(u.hostname)) usage(`${name} 仅允许本机回环地址（127.0.0.0/8、::1、localhost），收到 ${u.hostname}`);
  return u.origin;
}

/** 校验 WebSocket 地址：必须是 ws: 且回环（CDP 返回的 webSocketDebuggerUrl 也不能绕过入口限制）。 */
function assertLoopbackWsUrl(raw, name) {
  let u;
  try { u = new URL(String(raw)); } catch { throw new CliError('protocol', `${name} 不是合法 WebSocket URL: ${raw}`, { stage: 'ws-url' }); }
  if (u.protocol !== 'ws:') throw new CliError('protocol', `${name} 只支持 ws:（不支持 wss:），收到 ${u.protocol}`, { stage: 'ws-url', url: String(raw) });
  if (!loopbackHost(u.hostname)) throw new CliError('transport', `${name} 非回环，拒绝连接: ${u.hostname}`, { stage: 'ws-url', url: String(raw) });
  const port = Number(u.port || 80);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new CliError('protocol', `${name} 端口非法: ${u.port}`, { stage: 'ws-url' });
  return u;
}

/** 调用方提供的实例身份：`<pid>:<processStartTimeUtc>`（由 ui-driver openApplication 结果提供）。 */
function instanceIdentity({ required = false } = {}) {
  const raw = opt.instance;
  if (raw === undefined) {
    if (required) usage('缺少 --instance：请用 ui-driver 的 application.open 结果（processInfo.processId:processStartTimeUtc）作为实例身份');
    return null;
  }
  if (typeof raw !== 'string' || /\s/.test(raw) || !/^\d+:.+$/.test(raw)) {
    usage('--instance 必须是 "<pid>:<processStartTimeUtc>"（由 application.open 提供），不能是手填地址或其他字符串');
  }
  return raw;
}

// ---------------- websocket 帧 ----------------
function acceptKey(key) { return crypto.createHash('sha1').update(String(key) + WS_GUID).digest('base64'); }

function encodeFrame(opcode, payload, { fin = true, mask = true } = {}) {
  const p = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload), 'utf8');
  const len = p.length;
  const head = [];
  head.push((fin ? 0x80 : 0x00) | (opcode & 0x0f));
  const mb = mask ? 0x80 : 0x00;
  if (len < 126) head.push(mb | len);
  else if (len < 65536) head.push(mb | 126, (len >> 8) & 0xff, len & 0xff);
  else { head.push(mb | 127); const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(len)); for (const x of b) head.push(x); }
  const h = Buffer.from(head);
  if (!mask) return Buffer.concat([h, p]);
  const m = crypto.randomBytes(4);
  const out = Buffer.from(p);
  for (let i = 0; i < out.length; i++) out[i] ^= m[i % 4];
  return Buffer.concat([h, m, out]);
}

function createDecoder(onFrame) {
  let buf = Buffer.alloc(0);
  return (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const b0 = buf[0]; const b1 = buf[1];
      const fin = (b0 & 0x80) !== 0;
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f; let off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      let maskKey;
      if (masked) { if (buf.length < off + 4) return; maskKey = buf.subarray(off, off + 4); off += 4; }
      if (buf.length < off + len) return;
      const payload = Buffer.from(buf.subarray(off, off + len));
      if (masked) for (let i = 0; i < payload.length; i++) payload[i] ^= maskKey[i % 4];
      buf = buf.subarray(off + len);
      onFrame({ fin, opcode, payload, text: payload.toString('utf8') });
    }
  };
}

const safeJson = (s) => { try { return JSON.parse(s); } catch { return null; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 带总期限的消息/关闭队列；支持分片、ping/pong、close 与有界销毁。 */
class Mux {
  constructor(socket, { head = Buffer.alloc(0), deadlineAt = 0, tag = 'ws' } = {}) {
    this.socket = socket; this.deadlineAt = deadlineAt; this.tag = tag;
    this.queue = []; this.waiters = []; this.ended = false; this.error = null; this._closed = false;
    this._frag = null; this._closeTimer = null;
    this._decoder = createDecoder((f) => this._onFrame(f));
    socket.on('data', (d) => { try { this._decoder(d); } catch (e) { this._fail(new CliError('protocol', `${tag} 帧解码失败: ${e.message}`, { stage: tag })); } });
    socket.on('error', (e) => this._fail(new CliError('transport', `${tag} 连接错误: ${e.code || e.message}`, { stage: tag })));
    socket.on('close', () => this._end());
    if (head && head.length) { try { this._decoder(head); } catch (e) { this._fail(new CliError('protocol', `${tag} 握手残留数据解码失败: ${e.message}`, { stage: tag })); } }
  }
  _onFrame(f) {
    if (f.opcode === 0x1 || f.opcode === 0x2) this._startMessage(f);
    else if (f.opcode === 0x0) this._continueMessage(f);
    else if (f.opcode === 0x9) this._write(encodeFrame(0xA, f.payload));          // pong
    else if (f.opcode === 0xA) { /* ignore */ }
    else if (f.opcode === 0x8) { this._write(encodeFrame(0x8, Buffer.from([0x03, 0xe8]))); this._end(); this._destroySoon(100); }
  }
  _startMessage(f) {
    if (f.fin) { if (f.opcode === 0x1) this._push({ type: 'message', text: f.text }); return; }
    this._frag = { opcode: f.opcode, buffers: [f.payload] };
  }
  _continueMessage(f) {
    if (!this._frag) return;
    this._frag.buffers.push(f.payload);
    if (!f.fin) return;
    const { opcode, buffers } = this._frag;
    this._frag = null;
    if (opcode === 0x1) this._push({ type: 'message', text: Buffer.concat(buffers).toString('utf8') });
  }
  _push(item) { const w = this.waiters.shift(); if (w) w(item); else this.queue.push(item); }
  _notifyAll(item) { const ws = this.waiters.splice(0); for (const w of ws) w(item); }
  _end() {
    if (this.ended) return;
    this.ended = true;
    if (this._closeTimer) { clearTimeout(this._closeTimer); this._closeTimer = null; }
    this._notifyAll({ type: 'close' });
  }
  _fail(e) {
    if (this.error) return;
    this.error = e;
    this._notifyAll({ type: 'error', error: e });
    this._destroySoon(0);
  }
  _write(buf) { try { this.socket.write(buf); } catch { /* ignore */ } }
  _destroySoon(ms) { setTimeout(() => { try { this.socket.destroy(); } catch { /* ignore */ } }, ms); }
  sendText(obj) { this._write(encodeFrame(0x1, typeof obj === 'string' ? obj : JSON.stringify(obj))); }
  next() {
    if (this.queue.length) return Promise.resolve(this.queue.shift());
    if (this.error) return Promise.resolve({ type: 'error', error: this.error });
    if (this.ended) return Promise.resolve({ type: 'close' });
    return new Promise((res) => this.waiters.push(res));
  }
  /** 发送 close 帧并在 grace 后强制销毁，保证对端不协助关闭时有界结束。 */
  close(graceMs = 800) {
    if (this._closed) return;
    this._closed = true;
    this._write(encodeFrame(0x8, Buffer.from([0x03, 0xe8])));
    try { this.socket.end(); } catch { /* ignore */ }
    this._closeTimer = setTimeout(() => { try { this.socket.destroy(); } catch { /* ignore */ } }, Math.max(20, graceMs));
  }
}

/** 建立 WebSocket（手动升级），握手受 deadlineAt 约束；非 101 或 accept 不符均明确失败。
 * 仅接受 ws: 回环地址（由调用方传入的地址也经同一校验）。 */
function openWs(urlStr, { headers = {}, deadlineAt = Date.now() + 30000, name = 'WebSocket' } = {}) {
  const u = assertLoopbackWsUrl(urlStr, name);
  const key = crypto.randomBytes(16).toString('base64');
  const remaining = Math.max(1, deadlineAt - Date.now());
  const port = Number(u.port || 80);
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, v) => { if (settled) return; settled = true; clearTimeout(timer); fn(v); };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { req.destroy(); } catch { /* ignore */ }              // 无握手响应时销毁请求，避免句柄悬挂
      reject(new CliError('timeout', `WebSocket 握手超时（${remaining}ms）`, { stage: 'ws-handshake', url: urlStr }));
    }, remaining);
    const req = http.request({
      host: u.hostname,
      port,
      path: u.pathname + (u.search || ''),
      headers: {
        Connection: 'Upgrade', Upgrade: 'websocket',
        'Sec-WebSocket-Key': key, 'Sec-WebSocket-Version': '13', ...headers,
      },
    });
    req.on('upgrade', (res, socket, head) => {
      if (res.headers['sec-websocket-accept'] !== acceptKey(key)) {
        try { socket.destroy(); } catch { /* ignore */ }
        done(reject, new CliError('protocol', 'Sec-WebSocket-Accept 校验失败', { stage: 'ws-handshake' }));
        return;
      }
      done(resolve, new Mux(socket, { head, deadlineAt }));
    });
    req.on('response', (res) => {
      try { res.resume(); } catch { /* ignore */ }
      try { req.destroy(); } catch { /* ignore */ }
      done(reject, new CliError('http', `WebSocket 升级被拒绝：HTTP ${res.statusCode}`, { stage: 'ws-handshake', httpStatus: res.statusCode }));
    });
    req.on('error', (e) => done(reject, new CliError('transport', `WebSocket 连接失败：${e.code || e.message}`, { stage: 'ws-handshake' })));
    req.end();
  });
}

function raceTimeout(promise, ms) {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve({ type: 'timeout' }); } }, Math.max(0, ms));
    promise.then((v) => { if (!done) { done = true; clearTimeout(t); resolve(v); } });
  });
}

// ---------------- cookie ----------------
function readExplicitCookie() {
  if (typeof opt.cookie === 'string') return opt.cookie;
  if (typeof opt['cookie-file'] === 'string') {
    try { return fs.readFileSync(opt['cookie-file'], 'utf8').trim(); }
    catch (e) { usage(`无法读取 --cookie-file: ${e.message}`); }
  }
  return null;
}

function readCache() {
  if (!fs.existsSync(COOKIE_FILE)) return null;
  const text = fs.readFileSync(COOKIE_FILE, 'utf8').trim();
  let j = null;
  try { j = JSON.parse(text); } catch { return { legacy: true }; }
  if (!j || typeof j !== 'object' || j.version !== CACHE_VERSION) return { legacy: true };
  return j;
}

function saveCookie(cookie, instance) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(COOKIE_FILE, JSON.stringify({
    version: CACHE_VERSION, host: HOST, cdp: CDP, instance, savedAt: new Date().toISOString(), cookie,
    identitySource: 'ui-driver application.open (processId:processStartTimeUtc)',
  }));
}

/**
 * 取得 cookie。
 * - 显式 --cookie/--cookie-file：只提供凭据，**不证明实例身份**（保证范围见 README）。
 * - 缓存：必须同时满足「版本、host/cdp 一致、调用方 --instance 与缓存记录一致」。
 *   身份由调用方从 ui-driver application.open 取得并在每次使用时重申；
 *   tptapi 自身无法独立证明宿主端口与 CDP 属于同一进程（见 README 限制）。
 */
function requireCookie() {
  const explicit = readExplicitCookie();
  if (explicit) return explicit;
  const c = readCache();
  if (!c) usage('缺少 cookie：先运行 `node tptapi.mjs cookie`（需 --instance），或用 --cookie/--cookie-file 指定');
  if (c.legacy) usage('缓存缺少来源/身份信息（旧格式），不再静默迁移；请重新运行 `node tptapi.mjs cookie --instance <pid:startTime>` 或显式使用 --cookie');
  if (c.host !== HOST || c.cdp !== CDP) {
    usage(`缓存来自其他宿主/CDP（cache host=${c.host} cdp=${c.cdp}），不再自动复用；请重新运行 cookie 或显式使用 --cookie`);
  }
  const want = instanceIdentity({ required: true });   // 每次使用必须重申实例身份
  if (c.instance !== want) {
    usage(`实例身份不一致（cache instance=${c.instance}，--instance=${want}）：可能已重启或换了实例，拒绝复用缓存`);
  }
  if (typeof c.cookie !== 'string' || !c.cookie) usage('缓存 cookie 无效，请重新运行 cookie');
  return c.cookie;
}

function cdpJsonList(deadlineAt) {
  const ms = Math.max(1, deadlineAt - Date.now());
  return fetch(CDP + '/json/list', { redirect: 'manual', signal: AbortSignal.timeout(ms) })
    .then(async (res) => {
      if (res.status >= 300) throw new CliError('http', `CDP /json/list 返回 HTTP ${res.status}`, { stage: 'cdp-list', httpStatus: res.status });
      let list;
      try { list = await res.json(); } catch { throw new CliError('protocol', 'CDP /json/list 不是 JSON', { stage: 'cdp-list' }); }
      if (!Array.isArray(list)) throw new CliError('protocol', 'CDP /json/list 不是数组', { stage: 'cdp-list' });
      return list;
    })
    .catch((e) => {
      if (e instanceof CliError) throw e;
      throw new CliError(e && e.name === 'TimeoutError' ? 'timeout' : 'transport', `CDP /json/list 失败：${(e && e.name) || e}`, { stage: 'cdp-list' });
    });
}

async function cdpGetCookies(wsUrl, deadlineAt) {
  const mux = await openWs(wsUrl, { deadlineAt, name: 'CDP 调试端点' });
  try {
    mux.sendText({ id: 1, method: 'Network.getCookies', params: { urls: [HOST + '/'] } });
    const item = await raceTimeout(mux.next(), Math.max(1, deadlineAt - Date.now()));
    if (item.type === 'timeout') throw new CliError('timeout', 'CDP 读取 cookie 超时', { stage: 'cdp-cookies' });
    if (item.type === 'error') throw item.error;
    if (item.type !== 'message') throw new CliError('transport', 'CDP 连接在返回结果前关闭', { stage: 'cdp-cookies' });
    const m = safeJson(item.text);
    if (!m || m.id !== 1) throw new CliError('protocol', 'CDP 返回非预期消息', { stage: 'cdp-cookies' });
    if (m.error) throw new CliError('cdp', `Network.getCookies 报错：${m.error.message || JSON.stringify(m.error)}`, { stage: 'cdp-cookies' });
    const cookies = (m.result && m.result.cookies) || [];
    const auth = cookies.filter((c) => c && typeof c.name === 'string' && c.name.startsWith('dsh-auth-'));
    if (!auth.length) throw new CliError('cdp', '未取得 dsh-auth cookie（实例可能未登录宿主）', { stage: 'cdp-cookies' });
    return auth.map((c) => c.name + '=' + c.value).join('; ');
  } finally {
    try { mux.close(600); } catch { /* ignore */ }
  }
}

async function fetchCookieFromCdp(deadlineAt) {
  const list = await cdpJsonList(deadlineAt);
  const candidates = list.filter((p) => p && p.type === 'page' && typeof p.url === 'string'
    && p.url.startsWith('dsh-app://') && typeof p.webSocketDebuggerUrl === 'string' && p.webSocketDebuggerUrl);
  if (candidates.length === 0) throw new CliError('cdp', 'CDP 未找到明确的产品 page target（dsh-app://）', { stage: 'cdp-select', targets: list.length });
  if (candidates.length > 1) throw new CliError('cdp', `CDP 找到 ${candidates.length} 个产品 target，无法确定唯一实例`, { stage: 'cdp-select', urls: candidates.map((c) => c.url) });
  return cdpGetCookies(candidates[0].webSocketDebuggerUrl, deadlineAt);
}

// ---------------- 一元请求 ----------------
/** 统一一元请求：保留真实 HTTP 状态、校验信封与 rpcId，不把错误响应当成功。 */
async function apiRequest(method, args, { timeoutMs } = {}) {
  const cookie = requireCookie();
  const rpcId = 'tptapi-' + crypto.randomUUID();
  const ms = Math.max(1, timeoutMs ?? intOpt(opt, 'timeout', { def: 30000, min: 1 }));
  let res;
  try {
    res = await fetch(`${HOST}/api/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId, method, payload: { args } }),
      redirect: 'manual',
      signal: AbortSignal.timeout(ms),
    });
  } catch (e) {
    throw new CliError(e && e.name === 'TimeoutError' ? 'timeout' : 'transport', `${method} 请求失败（${ms}ms）：${(e && e.name) || e}`, { stage: 'unary', endpoint: method });
  }
  if (res.status >= 300 && res.status < 400) {
    throw new CliError('transport', `拒绝跟随重定向（HTTP ${res.status}）：凭据只留在已绑定宿主`, { stage: 'unary', endpoint: method, httpStatus: res.status });
  }
  const text = await res.text().catch(() => '');
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  if (res.status >= 400) {
    throw new CliError('http', `${method} 返回 HTTP ${res.status}`, { stage: 'unary', endpoint: method, httpStatus: res.status, body: text.slice(0, 500) });
  }
  if (json === null || typeof json !== 'object') {
    throw new CliError('protocol', `${method} 响应不是 JSON 对象`, { stage: 'unary', endpoint: method, httpStatus: res.status, body: text.slice(0, 500) });
  }
  if (json.type !== 'server-response') {
    throw new CliError('protocol', `${method} 响应 type 非 server-response（${JSON.stringify(json.type)}）`, { stage: 'unary', endpoint: method, httpStatus: res.status });
  }
  if (json.rpcId !== rpcId) {
    throw new CliError('protocol', `${method} 响应 rpcId 与请求不一致`, { stage: 'unary', endpoint: method, httpStatus: res.status, expectRpcId: rpcId, gotRpcId: json.rpcId });
  }
  if (!json.result || typeof json.result !== 'object' || typeof json.result.ok !== 'boolean') {
    throw new CliError('protocol', `${method} 响应缺少合法的 result.ok`, { stage: 'unary', endpoint: method, httpStatus: res.status });
  }
  return { httpStatus: res.status, response: json };
}

function printResponse(r, extra) {
  console.log(JSON.stringify({ ...r.response, httpStatus: r.httpStatus, ...(extra || {}) }, null, opt.pretty ? 2 : 0));
}

async function callAndPrint(method, args) {
  const r = await apiRequest(method, args);
  printResponse(r);
  if (r.response.result.ok === false) process.exitCode = 2;
  return r;
}

function parseArgs() {
  if (typeof opt['args-file'] === 'string') {
    try { return JSON.parse(fs.readFileSync(opt['args-file'], 'utf8')); } catch (e) { usage(`--args-file 不是合法 JSON: ${e.message}`); }
  }
  if (typeof opt.args === 'string') {
    try { return JSON.parse(opt.args); } catch (e) { usage(`--args 不是合法 JSON: ${e.message}`); }
  }
  return {};
}

// ---------------- 命令 ----------------
async function cmdCookie() {
  const totalMs = intOpt(opt, 'timeout', { def: 8000, min: 1 });
  const instance = instanceIdentity({ required: true });   // 记录身份来源，供后续使用时重申
  const deadlineAt = Date.now() + totalMs;
  const cookie = await fetchCookieFromCdp(deadlineAt);
  saveCookie(cookie, instance);
  console.log(JSON.stringify({
    ok: true, host: HOST, cdp: CDP, instance, saved: COOKIE_FILE,
    cookieNames: cookie.split('; ').map((s) => s.split('=')[0]),
  }, null, opt.pretty ? 2 : 0));
}

function cmdVerbs() {
  const file = path.join(__dirname, 'endpoints.json');
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));
  const filter = typeof opt.filter === 'string' ? opt.filter : null;
  const items = filter ? list.filter((e) => e.includes(filter)) : list;
  console.log(JSON.stringify({ count: items.length, endpoints: items }, null, opt.pretty ? 2 : 0));
}

async function cmdCall() {
  const method = pos[1];
  if (!method) usage('用法: call <endpoint> [--args <json>|--args-file <path>]');
  await callAndPrint(method, parseArgs());
}

async function cmdRaw() {
  const method = pos[1];
  const json = pos[2];
  if (!method) usage('用法: raw <endpoint> <args-json>');
  let args = {};
  if (json !== undefined) {
    try { args = JSON.parse(json); } catch (e) { usage(`<args-json> 不是合法 JSON: ${e.message}`); }
  }
  await callAndPrint(method, args);
}

async function cmdSession() {
  const sub = pos[1];
  const sid = pos[2];
  const text = typeof opt.text === 'string' ? opt.text : pos[3];
  if (sub === 'list') return callAndPrint('session/list', { _request: {} });
  if (sub === 'create') {
    const request = {};
    if (typeof opt.workspaceId === 'string') request.workspaceId = opt.workspaceId;
    if (typeof opt.cwd === 'string') request.cwd = opt.cwd;
    if (typeof opt.preset === 'string') request.agentPreset = opt.preset;
    return callAndPrint('session/create', { request });
  }
  if (sub === 'prompt') {
    if (!sid || !text) usage('用法: session prompt <sessionId> <text> [--mode queue|steer] [--tz <zone>] [--requestId <id>]');
    const mode = typeof opt.mode === 'string' ? opt.mode : 'queue';
    if (!PROMPT_MODES.has(mode)) usage(`--mode 必须是 queue|steer，收到 ${mode}`);
    const requestId = typeof opt.requestId === 'string' ? opt.requestId : 'req-' + crypto.randomUUID();
    if (!requestId.trim() || /\s/.test(requestId)) usage('--requestId 不能为空或含空白');
    const r = await apiRequest('session/prompt', {
      request: {
        requestId, sessionId: sid, mode,
        content: [{ type: 'text', text }],
        clientTimeZone: typeof opt.tz === 'string' ? opt.tz : 'Asia/Shanghai',
      },
    });
    printResponse(r, {
      _request: {
        requestId, sessionId: sid, mode,
        accepted: r.response.result.ok === true ? (r.response.result.value?.accepted ?? null) : false,
        fieldSource: 'client-generated requestId（客户端字段，非服务端确认字段）',
      },
    });
    if (r.response.result.ok === false) process.exitCode = 2;
    return r;
  }
  if (sub === 'projections') {
    if (!sid) usage('用法: session projections <sessionId>');
    return callAndPrint('session/projections', { request: { sessionId: sid } });
  }
  if (sub === 'cancel') {
    if (!sid) usage('用法: session cancel <sessionId>');
    return callAndPrint('session/cancel', { request: { sessionId: sid } });
  }
  if (sub === 'page') {
    if (!sid) usage('用法: session page <sessionId> [--throughSeq n] [--beforeSeq n] [--max n]');
    const maxMessages = intOpt(opt, 'max', { def: 200, min: 1 });
    let throughSeq;
    if (opt.throughSeq !== undefined) throughSeq = intOpt(opt, 'throughSeq', { min: 0 });
    else {
      const pr = await apiRequest('session/projections', { request: { sessionId: sid } });
      if (pr.response.result.ok === false) { printResponse(pr); process.exitCode = 2; return; }
      const asOf = pr.response.result.value && pr.response.result.value.asOfSeq;
      if (!Number.isInteger(asOf) || asOf < 0) {
        throw new CliError('protocol', 'session/projections 未返回可用的 asOfSeq，无法确定 throughSeq（可用 --throughSeq 显式指定）', { stage: 'page' });
      }
      throughSeq = asOf;
    }
    const request = { address: { kind: 'session', sessionId: sid }, throughSeq, maxMessages };
    if (opt.beforeSeq !== undefined) request.beforeSeq = intOpt(opt, 'beforeSeq', { min: 0 });
    const r = await apiRequest('session/page', { request });
    const value = r.response.result.value || {};
    const records = Array.isArray(value.records) ? value.records : [];
    const seqs = records.map((x) => (x && x.seq)).filter(Number.isInteger);
    const hasMore = value.hasMore === true;
    const nextBeforeSeq = hasMore && seqs.length ? Math.min(...seqs) : null;
    let status = 'complete';
    let stopReason = null;
    if (r.response.result.ok === false) { status = 'failed'; stopReason = 'business-error'; }
    else if (hasMore) {
      status = 'partial';
      if (nextBeforeSeq === null) stopReason = 'has-more-without-usable-cursor';
      else if (nextBeforeSeq >= (request.beforeSeq ?? throughSeq)) stopReason = 'cursor-not-advancing';
      else stopReason = 'has-more';
    }
    const extra = {
      _page: {
        throughSeq, hasMore, nextBeforeSeq, status, stopReason,
        hint: status === 'complete'
          ? '已到最早记录'
          : status === 'failed'
            ? '业务失败：未取全，停止翻页'
            : stopReason === 'has-more'
              ? `未取全：用相同 --throughSeq ${throughSeq} 与 --beforeSeq ${nextBeforeSeq} 继续翻页，直到 status=complete`
              : `未取全（${stopReason}）：游标不可用，停止翻页并报告，不要宣布已完成`,
      },
    };
    printResponse(r, extra);
    if (r.response.result.ok === false) process.exitCode = 2;
    return;
  }
  usage('未知子命令: session ' + sub);
}

async function cmdCommand() {
  const sid = pos[1];
  const line = pos[2];
  if (!sid || !line) usage('用法: command <sessionId> <line>（例: command <sid> "/permission read-only"）');
  await callAndPrint('commands/execute', { agentId: sid, line, submittedAttachments: [] });
}

async function cmdPermission() {
  const sid = pos[1];
  const preset = pos[2];
  if (!sid || !preset) usage('用法: permission <sessionId> <read-only|workspace-write|danger-full-access|auto>');
  if (!PERMISSION_PRESETS.has(preset)) usage(`未知 permission preset: ${preset}（支持 ${[...PERMISSION_PRESETS].join(', ')}）`);
  await callAndPrint('commands/execute', { agentId: sid, line: '/permission ' + preset, submittedAttachments: [] });
}

async function cmdWorkspace() {
  const sub = pos[1];
  const arg = pos[2];
  if (sub === 'create') {
    if (!arg) usage('用法: workspace create <path>');
    return callAndPrint('workspace/create', { request: { path: arg } });
  }
  if (sub === 'delete') {
    if (!arg) usage('用法: workspace delete <workspaceId>');
    return callAndPrint('workspace/delete', { request: { workspaceId: arg } });
  }
  usage('未知子命令: workspace ' + sub);
}

/**
 * 订阅 $events 并应答审批。
 * - 事件串行处理（同一时刻最多 1 个在途回送），全局额度覆盖在途请求；
 * - 只有服务端明确确认成功才增加 answered；按 eventId 去重（含跨重连）；
 * - 每步只用剩余总期限，不重新获得完整 timeout；结束时必有界关闭连接。
 */
async function cmdApprove() {
  const sid = pos[1];
  const decision = pos[2];
  if (!sid || !decision) usage('用法: approve <sessionId> <allowed-once|rejected|cancelled> [--timeout ms] [--count n]');
  if (!APPROVAL_DECISIONS.has(decision)) usage(`非法 decision: ${decision}（支持 ${[...APPROVAL_DECISIONS].join(', ')}）`);
  const want = intOpt(opt, 'count', { def: 1, min: 1 });
  const totalMs = intOpt(opt, 'timeout', { def: 60000, min: 1 });
  const attemptMs = intOpt(opt, 'attempt-ms', { def: 8000, min: 1 });
  const cookie = requireCookie();
  const deadlineAt = Date.now() + totalMs;

  const state = new Map();
  const approvals = [];
  let answered = 0;
  let attempts = 0;
  let failure = null;
  let terminationReason = 'incomplete';

  while (answered < want && Date.now() < deadlineAt && !failure) {
    const attemptDeadlineAt = Math.min(deadlineAt, Date.now() + attemptMs);
    attempts++;
    let mux;
    try {
      mux = await openWs(HOST.replace(/^http:/, 'ws:') + '/api/remote.mux', {
        headers: { Cookie: cookie }, deadlineAt: attemptDeadlineAt, name: '宿主 mux',
      });
    } catch (e) {
      if (e instanceof CliError && e.kind === 'timeout') { terminationReason = 'deadline'; break; }
      failure = e;
      break;
    }
    try {
      mux.sendText({ type: 'open', streamId: 'ev', endpoint: '$events', payload: { args: {} } });
      let clientId = null;
      while (answered < want && !failure) {
        const remain = Math.min(attemptDeadlineAt, deadlineAt) - Date.now();
        if (remain <= 0) break;
        const item = await raceTimeout(mux.next(), remain);
        if (item.type === 'timeout') break;
        if (item.type === 'close') break;
        if (item.type === 'error') { failure = item.error; break; }
        const m = safeJson(item.text);
        if (!m || m.type !== 'item' || m.streamId !== 'ev' || !m.value) continue;
        const v = m.value;
        if (v.type === 'ready') { clientId = typeof v.clientId === 'string' && v.clientId ? v.clientId : null; continue; }
        if (v.type !== 'waterfall' || v.event !== 'approval/request') continue;
        if (v.agentId !== sid) continue;
        if (!v.eventId) { failure = new CliError('protocol', 'approval/request 缺少 eventId', { stage: 'approve' }); break; }
        if (!clientId) { failure = new CliError('protocol', '收到 approval/request 但未取得 clientId（ready 丢失）', { stage: 'approve', eventId: v.eventId }); break; }
        if (state.has(v.eventId)) continue;                     // 去重
        if (answered >= want) break;
        state.set(v.eventId, { status: 'inflight' });
        const remain2 = Math.max(1, Math.min(attemptDeadlineAt, deadlineAt) - Date.now());
        let sent;
        try {
          const r = await apiRequest('$events/result', {
            clientId, eventId: v.eventId, outcome: { kind: 'result', value: decision },
          }, { timeoutMs: remain2 });
          sent = { ok: r.response.result.ok === true, httpStatus: r.httpStatus, response: r.response, error: null };
        } catch (e) {
          sent = { ok: false, error: e };
        }
        const base = { agentId: v.agentId, eventId: v.eventId, tool: v.request && v.request.toolName, decision };
        if (sent.ok) {
          answered++;
          state.set(v.eventId, { status: 'answered' });
          approvals.push({ ...base, ok: true });
        } else {
          state.set(v.eventId, { status: 'failed' });
          if (sent.error) {
            approvals.push({ ...base, ok: false, error: { kind: sent.error.kind, message: sent.error.message, ...(sent.error.meta || {}) } });
            failure = sent.error;
          } else {
            approvals.push({ ...base, ok: false, error: { kind: 'business', httpStatus: sent.httpStatus, response: sent.response } });
            failure = new CliError('business', '$events/result 返回业务 ok:false', { stage: 'approve-result', eventId: v.eventId });
          }
          break;
        }
      }
    } finally {
      try { mux.close(Math.min(800, Math.max(50, deadlineAt - Date.now()))); } catch { /* ignore */ }
    }
    if (failure || answered >= want) break;
    const waitMs = Math.min(1000, deadlineAt - Date.now());
    if (waitMs > 0) await sleep(waitMs);
  }

  const remaining = Math.max(0, want - answered);
  if (!failure) terminationReason = answered >= want ? 'quota-met' : 'deadline';
  else terminationReason = 'failed';
  console.log(JSON.stringify({ requested: want, answered, remaining, attempts, decision, terminationReason, approvals }));
  if (failure) {
    const meta = { ...(failure.meta || {}), terminationReason };
    console.error(JSON.stringify({ error: { kind: failure.kind, message: failure.message, ...meta } }));
    process.exitCode = failure.kind === 'business' ? 2 : 1;
  } else if (answered < want) {
    process.exitCode = 3;
  }
}

function printHelp() {
  console.log(`tptapi — TPT Work 本地宿主接口客户端

用法: node tptapi.mjs <command> [options]

全局: --host <url> (默认 ${DEFAULT_HOST})  --cdp <url> (默认 ${DEFAULT_CDP})  --cookie <hdr>  --cookie-file <path>  --pretty
      --host/--cdp 仅允许 **http** 回环地址（不支持 https/wss）；未知参数、缺值、非法取值都会在发请求前拒绝。
      --instance <pid:startTimeUtc>  实例身份（由 ui-driver application.open 提供）；使用缓存时必填。

命令:
  cookie [--timeout ms] --instance <id>  从运行实例的 CDP 读取鉴权 cookie 并缓存（记录 host/cdp/实例身份）
  verbs [--filter <s>]                   列出静态导出的可调用端点
  call <endpoint> [--args <json>|--args-file <f>]   一元调用
  raw <endpoint> <args-json>             一元调用（参数作为位置参数）
  session list|create|prompt|projections|cancel ...
  session prompt <sessionId> <text> [--mode queue|steer] [--requestId <id>]
                                         输出 _request.requestId（客户端字段）与 accepted
  session page <sessionId> [--throughSeq n] [--beforeSeq n] [--max n]
                                         未传 --throughSeq 时先取 projections 的 asOfSeq；输出 _page.status/stopReason
  command <sessionId> <line>             执行命令（如 "/permission read-only"）
  permission <sessionId> <preset>        切换任务访问模式
  workspace create <path> | delete <id>  建/删项目
  approve <sessionId> <allowed-once|rejected|cancelled> [--timeout ms] [--count n]
                                         订阅 $events 并应答审批（仅指定 session；已移除 --any）

退出码: 0 成功; 1 用法/HTTP/协议/传输错误; 2 业务 ok:false; 3 approve 未达 requested
`);
}

// ---------------- 分发 ----------------
const commands = {
  cookie: cmdCookie, verbs: cmdVerbs, call: cmdCall, raw: cmdRaw,
  session: cmdSession, command: cmdCommand, permission: cmdPermission,
  workspace: cmdWorkspace, approve: cmdApprove,
};

let opt = {};
let pos = [];
let HOST = DEFAULT_HOST;
let CDP = DEFAULT_CDP;

async function main() {
  const parsed = parseArgv(process.argv.slice(2));
  if (parsed.errors.length) usage(parsed.errors.join('; '));
  pos = parsed.pos;
  opt = parsed.opt;
  const command = pos[0];
  HOST = normalizeEndpoint(opt.host ?? DEFAULT_HOST, '--host');
  CDP = normalizeEndpoint(opt.cdp ?? DEFAULT_CDP, '--cdp');
  if (!command || opt.help || command === 'help') { printHelp(); return; }
  const fn = commands[command];
  if (!fn) usage('未知命令: ' + command);
  await fn();
}

main().catch((e) => reportError(e));
