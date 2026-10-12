// 任务支撑层：记忆与进化面板/设置定位与读取（PC88 记忆任务）
import { connect } from './session.mjs';

const SETTINGS = '[data-shortcut-modal="settings"]';

async function closeTopDialogs(page) {
  for (let i = 0; i < 4; i++) {
    const n = await page.locator('[data-shortcut-modal]').count();
    if (!n) break;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
}

// 打开头像菜单（若未展开）
export async function openAccountMenu(ctx, page) {
  const name = ctx.environment.account_name;
  // 菜单项“记忆与进化”已可见则直接返回
  if (await page.getByText('记忆与进化', { exact: true }).count()) return;
  await closeTopDialogs(page);
  await page.locator('button', { hasText: name }).first().click();
  await page.waitForTimeout(700);
}

// 打开记忆与进化面板（头像菜单入口）
export async function openMemoryPanel(ctx) {
  const conn = await connect(ctx);
  const { page } = conn;
  await closeTopDialogs(page);
  await openAccountMenu(ctx, page);
  await page.getByText('记忆与进化', { exact: true }).first().click();
  await page.waitForTimeout(2000);
  return conn;
}

// 打开 设置 → 记忆与进化
export async function openMemorySettings(ctx) {
  const conn = await connect(ctx);
  const { page } = conn;
  if (!(await page.locator(SETTINGS).count())) {
    await closeTopDialogs(page);
    await page.locator('button', { hasText: ctx.environment.account_name }).first().click();
    await page.waitForTimeout(700);
    await page.getByText(/^(设置|Settings)$/).first().click();
    await page.waitForTimeout(1500);
  }
  const dlg = page.locator(SETTINGS);
  const cell = dlg.locator('button[class*="navCell"]').filter({ hasText: /记忆与进化|Memory & Evolution/ });
  await cell.first().click();
  await page.waitForTimeout(1200);
  return conn;
}

// 通用：读取一个可见面板/设置分区的文本与控件
export async function dumpSurface(page, scope) {
  const sel = scope || 'body';
  const root = page.locator(sel).first();
  if (!(await root.count())) throw new Error('Memory scope not found: ' + sel);
  const text = await root.innerText();
  const controls = await page.evaluate((s) => {
    const scopeEl = document.querySelector(s);
    if (!scopeEl) throw new Error('Memory scope not found: ' + s);
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const rows = [...scopeEl.querySelectorAll('button,[role="switch"],input,select,[role="tab"],[role="radio"]')].filter(vis).map((e) => ({
      tag: e.tagName.toLowerCase(),
      role: e.getAttribute('role'),
      type: e.type || null,
      label: (e.getAttribute('aria-label') || '').trim() || null,
      text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40) || null,
      checked: e.tagName === 'INPUT' && e.type === 'checkbox' ? e.checked : (e.getAttribute('aria-checked') ?? e.getAttribute('aria-pressed')),
      cls: String(e.className || '').slice(0, 48),
    }));
    return rows;
  }, sel);
  return { text, controls, frames: page.frames().map((f) => f.url()) };
}

// 读取设置页某个分区的行标签与控件
export async function readSettingRows(page) {
  return await page.evaluate((s) => {
    const d = document.querySelector(s);
    if (!d) return null;
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const rows = [...d.querySelectorAll('[class*="row"],[class*="cfg-row"],[class*="Row"]')].filter(vis).map((r) => {
      const ctl = r.querySelector('[role="switch"],input[type="checkbox"],button[class*="selector"],[role="radio"]');
      return {
        text: (r.innerText || '').replace(/\s+/g, ' ').trim(),
        control: ctl ? { tag: ctl.tagName.toLowerCase(), role: ctl.getAttribute('role'), type: ctl.type || null } : null,
      };
    }).filter((x) => x.text);
    return rows;
  }, SETTINGS);
}

// 点击设置弹窗内精确文本（按钮/页签），返回点击前后的可见弹窗文本
export async function clickText(page, text, wait = 1200) {
  await page.locator(SETTINGS).getByText(text, { exact: true }).first().click();
  await page.waitForTimeout(wait);
}

// 读取当前所有可见弹窗/Dialog 文本
export async function readDialogs(page) {
  return await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return [...document.querySelectorAll('[role="dialog"],[class*="dialog" i],[class*="modal" i],[class*="drawer" i]')]
      .filter(vis)
      .map((e) => ({ cls: String(e.className).slice(0, 60), text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 600) }))
      .filter((x) => x.text);
  });
}

// 读取记忆设置页当前可见文本与输入控件值
export async function readMemorySurface(page) {
  const text = await page.locator(SETTINGS).innerText();
  const inputs = await page.evaluate((s) => {
    const d = document.querySelector(s);
    if (!d) return null;
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return [...d.querySelectorAll('input,textarea,button[class*="selector"]')].filter(vis).map((e) => ({
      tag: e.tagName.toLowerCase(), type: e.type || null, value: e.type === 'checkbox' ? e.checked : (e.value ?? null),
      label: (e.getAttribute('aria-label') || '').trim() || null, cls: String(e.className).slice(0, 40),
    }));
  }, SETTINGS);
  return { text, inputs };
}

// 读取高级设置视图（面板内）的行标签与输入值
export async function readAdvancedRows(page, scope) {
  const s = scope || SETTINGS;
  return await page.evaluate((sel) => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const root = document.querySelector(sel);
    if (!root) return null;
    const rows = [...root.querySelectorAll('[class*="cfg-row"],[class*="row"],label')].filter(vis).map((r) => {
      const inp = r.querySelector('input,select,textarea');
      if (!inp) return null;
      return {
        label: (r.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120),
        tag: inp.tagName.toLowerCase(), type: inp.type || null,
        value: inp.type === 'checkbox' ? inp.checked : inp.value,
      };
    }).filter(Boolean);
    const buttons = [...root.querySelectorAll('button')].filter(vis).map((b) => (b.innerText || '').trim()).filter(Boolean);
    return { rows, buttons, text: (root.innerText || '').replace(/\s+/g, ' ').trim() };
  }, s);
}

export { SETTINGS, closeTopDialogs };
