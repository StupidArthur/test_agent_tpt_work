// Shared TPT Work automation helpers (this task's runtime support).
// All operations go through Playwright connected to the product's CDP endpoint.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));

export const taskRoot = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function withApp(ctx, fn) {
  const endpoint = ctx?.environment?.cdp_endpoint ?? 'http://127.0.0.1:9234';
  const browser = await chromium.connectOverCDP(endpoint);
  try {
    const pages = browser.contexts().flatMap((c) => c.pages());
    const app = pages.find((p) => p.url().startsWith('dsh-app://')) ?? pages.find((p) => p.url().includes('renderer/'));
    if (!app) throw new Error('TPT Work main page not found');
    return await fn(app, browser);
  } finally {
    await browser.close();
  }
}

export function readTextFile(p) {
  return fs.readFileSync(p, 'utf8');
}

export const SELECTORS = {
  composer: '[data-conversation-region="composer"] [contenteditable="true"], [contenteditable="true"]',
  workspace: '.pXSMma_workspace',
  session: '[data-conversation-session]',
  chat: '[data-conversation-region="chat"]',
};

export async function newTask(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(300);
  await page.getByRole('button', { name: '新建任务', exact: true }).first().click({ timeout: 10000 });
  await sleep(1500);
}

export async function selectProject(page) {
  const ws = page.locator(SELECTORS.workspace).first();
  const before = (await ws.innerText().catch(() => '')).trim();
  await ws.click({ timeout: 8000 });
  await sleep(600);
  const item = page.getByRole('menuitem', { name: /^tpt-workspace/ }).first();
  if (!(await item.count())) throw new Error('project menuitem not found');
  await item.click({ timeout: 8000 });
  await sleep(800);
  const after = (await ws.innerText().catch(() => '')).trim();
  return { before, after };
}

export async function sessionId(page) {
  return page.evaluate(() => document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? null);
}

export async function typeAndSend(page, text) {
  const composer = page.locator(SELECTORS.composer).first();
  await composer.click({ timeout: 8000 });
  await composer.fill(text);
  await sleep(300);
  const send = page.locator('button[aria-label="发送消息"]').first();
  for (let i = 0; i < 40; i++) {
    if (!(await send.isDisabled().catch(() => true))) break;
    await sleep(300);
  }
  await send.click({ timeout: 8000 });
}

export async function runningCount(page) {
  return page.evaluate(() => {
    const norm = (s) => (s || '').trim();
    let n = 0;
    document.querySelectorAll('*').forEach((e) => {
      if (e.children.length) return;
      const t = norm(e.textContent);
      if (!['进行中', '探索中...', '正在准备对话…', '等待回答', '探索中'].includes(t)) return;
      if (!(e.offsetWidth || e.offsetHeight)) return;
      if (e.closest('[class*="sessionRow"]')) return;
      n++;
    });
    return n;
  });
}

export async function lastAssistantText(page) {
  return page.evaluate(() => {
    const chat = document.querySelector('[data-conversation-region="chat"]');
    if (!chat) return '';
    const bodies = [...chat.querySelectorAll('[class*="hWmORq_body"]')];
    const texts = bodies.map((b) => (b.innerText || '').trim()).filter(Boolean);
    return texts.at(-1) ?? '';
  });
}

export async function waitTerminal(page, { timeout = 180000, expect = null } = {}) {
  const start = Date.now();
  let last = '';
  while (Date.now() - start < timeout) {
    await sleep(3000);
    const running = await runningCount(page);
    last = (await lastAssistantText(page)).trim();
    if (running === 0 && last) {
      if (!expect || last.includes(expect)) return { ok: true, text: last, ms: Date.now() - start };
    }
  }
  return { ok: false, text: last, ms: Date.now() - start };
}

export async function expandMore(page) {
  const more = page.getByRole('button', { name: '更多', exact: true }).first();
  if (await more.count()) {
    const expanded = await more.getAttribute('aria-expanded').catch(() => null);
    if (expanded !== 'true') {
      await more.click({ timeout: 5000 }).catch(() => {});
      await sleep(600);
    }
  }
}

export async function skillsFrame(page) {
  let f = page.frame({ url: /supcon-skills/ });
  if (f) { try { await f.evaluate(() => 1); return f; } catch { /* detached */ } }
  await expandMore(page);
  await page.getByRole('button', { name: '技能', exact: true }).first().click({ timeout: 8000 }).catch(() => {});
  for (let i = 0; i < 15; i++) {
    await sleep(700);
    f = page.frame({ url: /supcon-skills/ });
    if (f) { try { await f.evaluate(() => 1); await sleep(500); return f; } catch { /* detached */ } }
  }
  return page.frame({ url: /supcon-skills/ });
}

export async function expertsFrame(page) {
  let f = page.frame({ url: /supcon-agents/ });
  if (f) { try { await f.evaluate(() => 1); return f; } catch { /* detached */ } }
  await expandMore(page);
  await page.getByRole('button', { name: '专家', exact: true }).first().click({ timeout: 8000 }).catch(() => {});
  for (let i = 0; i < 15; i++) {
    await sleep(700);
    f = page.frame({ url: /supcon-agents/ });
    if (f) { try { await f.evaluate(() => 1); await sleep(500); return f; } catch { /* detached */ } }
  }
  return page.frame({ url: /supcon-agents/ });
}

export function sha256(hexInput) {
  return require('node:crypto').createHash('sha256').update(hexInput).digest('hex');
}

export function sha256File(p) {
  return require('node:crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

export function fixtureRoot(ctx) {
  return path.join(taskRoot, '夹具', '本轮', ctx.runtime.extension_run);
}

export function baseFixtureRoot(ctx) {
  return path.join(taskRoot, '夹具', '基础', ctx.runtime.extension_run);
}
