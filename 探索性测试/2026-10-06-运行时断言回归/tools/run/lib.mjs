import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));

export const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
export const runSuffix = '20261006-oc1';
export const fixtureRoot = path.join(root, '夹具', '本轮', runSuffix);
export const scratchDir = path.join(root, 'tools', 'run', 'scratch');
fs.mkdirSync(scratchDir, { recursive: true });
export const environmentId = 'env-20261006-oc1';
export const project = 'tpt-workspace';

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function withApp(fn) {
  const port = Number(process.env.TPT_CDP_PORT ?? 9234);
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  try {
    const pages = browser.contexts().flatMap(c => c.pages());
    const app = pages.find(p => p.url().startsWith('dsh-app://')) ?? pages[0];
    if (!app) throw new Error('no app page');
    return await fn(app, browser);
  } finally {
    await browser.close();
  }
}

export function dump(name, obj) {
  const p = path.join(scratchDir, name + '.json');
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  console.log('WROTE ' + p);
  return p;
}

export function sha256File(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
export const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');

export function evidenceFor(group, extra = []) {
  const p = path.join(root, '运行日志', group + '.jsonl');
  const list = [];
  if (fs.existsSync(p)) list.push({ path: '运行日志/' + group + '.jsonl', sha256: sha256File(p) });
  for (const rel of extra) {
    const ap = path.join(root, rel);
    list.push({ path: rel.replaceAll('\\', '/'), sha256: sha256File(ap) });
  }
  return list;
}
export function writeResult(obj) {
  const p = path.join(root, '结果', obj.case_id + '.json');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

const _compare = require(path.join(root, 'tools', 'compare.cjs'));
export const compare = _compare;
export function loadCases() { return JSON.parse(fs.readFileSync(path.join(root, '用例', 'cases.json'), 'utf8')); }
export function loadContext() { return JSON.parse(fs.readFileSync(path.join(root, '运行上下文.json'), 'utf8')); }
export function resolveExpected(exp, ctx) { return (typeof exp === 'string' && exp.startsWith('$')) ? ctx[exp.slice(1)] : exp; }
export function finalizeCase({ case_id, attempt_id, environment_id, object_identity, inputs, action_refs, started_at, ended_at, actual_steps, assertions, cleanup, evidence, notes }) {
  const cases = loadCases(); const ctx = loadContext();
  const c = cases.find(x => x.id === case_id);
  if (!c) throw new Error('unknown case ' + case_id);
  const verdicts = [];
  const out = [];
  for (const a of c.assertions) {
    const v = assertions.find(x => x.id === a.id);
    if (!v) { verdicts.push(null); out.push({ id: a.id, actual: null, read_refs: [], reason: 'assertion not collected', failed_dependency: 'execution gap' }); continue; }
    const exp = resolveExpected(a.expected, ctx);
    const verdict = exp === undefined ? null : compare(a.operator, v.actual, exp);
    verdicts.push(verdict);
    out.push({ id: a.id, actual: v.actual, read_refs: v.read_refs || [], ...(v.reason ? { reason: v.reason } : {}), ...(v.failed_dependency ? { failed_dependency: v.failed_dependency } : {}) });
  }
  const status = verdicts.includes(false) ? '失败' : verdicts.includes(null) ? '不确定' : '通过';
  const result = { case_id, contract_version: c.contract_version, attempt_id, environment_id, object_identity, inputs, action_refs, status, started_at, ended_at, actual_steps, assertions: out, evidence, cleanup, notes };
  writeResult(result);
  return { status, result };
}

// ---- settings modal helpers ----
export async function isSettingsOpen(page) {
  return page.evaluate(() => {
    if ([...document.querySelectorAll('.VOzbGW_mask, .VOzbGW_overlay, [role="presentation"]')].some(e => e.offsetWidth)) return true;
    const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth && /常规/.test(e.innerText) && /关闭/.test(e.innerText));
    return !!d;
  });
}
export async function openSettings(page) {
  if (!(await isSettingsOpen(page))) {
    const menuVisible = await page.locator('[role="menu"]:visible').count();
    if (!menuVisible) {
      await page.locator('[data-slot="settings.user"] button[aria-haspopup="menu"]').first().click({ timeout: 8000 });
      await sleep(600);
    }
    await page.getByRole('menuitem', { name: '设置', exact: true }).click({ timeout: 8000 });
    await sleep(1200);
  }
  await openSettingsSection(page, '常规');
}
export async function openSettingsSection(page, name) {
  await sleep(300);
  const nav = page.locator('[role="dialog"]:visible button').filter({ hasText: new RegExp('^' + name) }).first();
  await nav.click({ timeout: 8000 }).catch(() => {});
  await sleep(800);
}
export async function closeSettings(page) {
  for (let i = 0; i < 6; i++) {
    if (!(await isSettingsOpen(page))) break;
    const close = page.locator('[role="dialog"] button').filter({ hasText: /^(关闭|Close)$/i }).first();
    if (await close.count()) await close.click({ timeout: 4000 }).catch(() => {});
    else await page.keyboard.press('Escape').catch(() => {});
    await sleep(700);
  }
}
export async function openAccountMenu(page) {
  if (!(await page.locator('[role="menu"]:visible').count())) {
    await page.locator('[data-slot="settings.user"] button[aria-haspopup="menu"]').first().click({ timeout: 8000 });
    await sleep(600);
  }
}

export async function dialogText(page) {
  return page.locator('[role="dialog"]:visible').first().innerText().catch(() => '');
}

export async function expandMore(page) {
  const more = page.getByRole('button', { name: '更多', exact: true }).first();
  if (await more.count()) {
    const expanded = await more.getAttribute('aria-expanded').catch(() => null);
    if (expanded !== 'true') { await more.click({ timeout: 5000 }).catch(() => {}); await sleep(600); }
  }
}
export async function skillsFrame(page) {
  let f = page.frame({ url: /supcon-skills/ });
  if (f) { try { await f.evaluate(() => 1); return f; } catch { /* detached */ } }
  await expandMore(page);
  await page.getByRole('button', { name: '技能', exact: true }).first().click({ timeout: 8000 }).catch(() => {});
  for (let i = 0; i < 12; i++) {
    await sleep(700);
    f = page.frame({ url: /supcon-skills/ });
    if (f) { try { await f.evaluate(() => 1); await sleep(400); return f; } catch { /* detached */ } }
  }
  return page.frame({ url: /supcon-skills/ });
}
export async function expertsFrame(page) {
  let f = page.frame({ url: /supcon-agents/ });
  if (f) { try { await f.evaluate(() => 1); return f; } catch { /* detached */ } }
  await expandMore(page);
  await page.getByRole('button', { name: '专家', exact: true }).first().click({ timeout: 8000 }).catch(() => {});
  for (let i = 0; i < 12; i++) {
    await sleep(700);
    f = page.frame({ url: /supcon-agents/ });
    if (f) { try { await f.evaluate(() => 1); await sleep(400); return f; } catch { /* detached */ } }
  }
  return page.frame({ url: /supcon-agents/ });
}

// ---- chat helpers ----
export const SEL = {
  composer: '[contenteditable="true"]',
  send: 'button[aria-label="发送消息"]',
  assistant: '[class*="hWmORq_body"]',
  user: '[class*="wSkVaW_body"]',
};
export async function newTask(page) {
  await page.getByRole('button', { name: '新建任务', exact: true }).first().click({ timeout: 10000 });
  await sleep(1500);
}
export async function typeAndSend(page, text) {
  const composer = page.locator(SEL.composer).first();
  await composer.click({ timeout: 8000 });
  await composer.fill(text);
  await sleep(300);
  const send = page.locator(SEL.send).first();
  for (let i = 0; i < 20; i++) { if (!(await send.isDisabled().catch(() => true))) break; await sleep(300); }
  await send.click({ timeout: 8000 });
}
export async function appendSend(page, text) {
  const composer = page.locator(SEL.composer).first();
  await composer.click({ timeout: 8000 });
  await page.keyboard.press('End');
  await page.keyboard.type(text);
  await sleep(400);
  const send = page.locator(SEL.send).first();
  for (let i = 0; i < 30; i++) { if (!(await send.isDisabled().catch(() => true))) break; await sleep(300); }
  await send.click({ timeout: 8000 });
}
export async function runningCount(page) {
  return page.evaluate(() => {
    const norm = s => (s || '').trim();
    let n = 0;
    document.querySelectorAll('*').forEach(e => {
      if (e.children.length) return;
      const t = norm(e.textContent);
      if (!(t === '进行中' || t === '探索中...' || t === '正在准备对话…' || t === '等待回答')) return;
      if (!(e.offsetWidth || e.offsetHeight)) return;
      if (e.closest('[class*="visuallyHidden"]') || e.closest('[class*="sessionRow"]')) return;
      n++;
    });
    return n;
  });
}
export async function waitTerminal(page, { timeout = 120000, expect = null } = {}) {
  const start = Date.now();
  let last = '';
  while (Date.now() - start < timeout) {
    await sleep(2500);
    const bodies = await page.locator(SEL.assistant).allInnerTexts().catch(() => []);
    const texts = bodies.map(t => t.trim()).filter(Boolean);
    last = texts.at(-1) || '';
    const running = await runningCount(page);
    if (texts.length && running === 0) {
      if (!expect || texts.some(t => t.includes(expect))) return { ok: true, text: last, ms: Date.now() - start };
    }
  }
  return { ok: false, text: last, ms: Date.now() - start };
}
export async function lastAssistantText(page) {
  const bodies = await page.locator(SEL.assistant).allInnerTexts().catch(() => []);
  const texts = bodies.map(t => t.trim()).filter(Boolean);
  return texts.at(-1) ?? '';
}
export async function productCardCount(page) {
  return page.evaluate(() => {
    // file deliverables are rendered as cards with file-ish affordances in the conversation area
    const sel = '[data-slot*="file"],[class*="fileCard"],[class*="FileCard"],[class*="artifact"],[class*="deliver"]';
    return [...document.querySelectorAll(sel)].filter(e => (e.offsetWidth || e.offsetHeight)).length;
  });
}

// read a named settings row value by walking the settings dialog for the label text
export async function settingsRowValue(page, label) {
  return page.evaluate((label) => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth && /常规/.test(e.innerText));
    if (!dlg) return null;
    // find element whose text is exactly the label
    const all = [...dlg.querySelectorAll('*')];
    const lab = all.find(e => e.children.length === 0 && (e.textContent || '').trim() === label);
    if (!lab) return null;
    // walk up to a row container then read sibling text
    let row = lab;
    for (let i = 0; i < 5 && row; i++) row = row.parentElement;
    return row ? row.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) : null;
  }, label);
}
