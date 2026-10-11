import { parseBoolean, readComposerRequest } from '../../automation/identity.mjs';
// 业务函数层：设置（常规/场景预设）读取与修改。
import { openSettings, gotoTab, SETTINGS_SEL } from '../../automation/settings.mjs';
import { connect } from '../../automation/session.mjs';

const D = SETTINGS_SEL.dialog;

async function readPressedText(page, filterList) {
  const btns = page.locator(`${D} button[aria-pressed="true"]`);
  const n = await btns.count();
  const texts = [];
  for (let i = 0; i < n; i++) texts.push((await btns.nth(i).innerText()).replace(/\s+/g, ' ').trim());
  return { texts, value: texts.find((t) => filterList.some((f) => t === f || t.startsWith(f))) || null };
}

// 读取常规初值：主题/语言/默认权限/字号；并切到场景预设读取场景。
export async function readGeneral(ctx) {
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await gotoTab(page, page, '常规');
    const theme = await rec.read('主题选中值', 'settings-theme', { channel: 'dom', scope: '设置/常规/外观', locator: `${D} button[aria-pressed]` }, async () => {
      const r = await readPressedText(page, ['浅色', '深色', '跟随系统']);
      return { value: r.value, raw: { pressedTexts: r.texts } };
    });
    const language = await rec.read('语言选中值', 'settings-language', { channel: 'dom', scope: '设置/常规/语言', locator: 'button[class*="hVGvvW_selector"]' }, async () => {
      const v = (await page.locator('button[class*="hVGvvW_selector"]').first().innerText()).trim();
      return { value: v, raw: { value: v } };
    });
    const permission = await rec.read('默认权限选中值', 'settings-permission', { channel: 'dom', scope: '设置/常规/权限', locator: 'button[class*="oY77xG_selector"]' }, async () => {
      const v = (await page.locator('button[class*="oY77xG_selector"]').first().innerText()).trim();
      return { value: v, raw: { value: v } };
    });
    const font = await rec.read('字号数值', 'settings-font', { channel: 'dom', scope: '设置/常规/字号', locator: 'button[aria-label="增大字号"]' }, async () => {
      const cssVar = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--dsh-content-font-size').trim());
      return { value: parseInt(cssVar, 10), raw: { cssVar } };
    });
    await gotoTab(page, page, '场景预设');
    const scene = await rec.read('场景选中值', 'settings-scene', { channel: 'dom', scope: '设置/场景预设', locator: `${D} button[aria-pressed="true"] [class*="cardName"]` }, async () => {
      const btns = page.locator(`${D} button[aria-pressed="true"]`);
      const n = await btns.count();
      const names = [];
      for (let i = 0; i < n; i++) {
        const cn = btns.nth(i).locator('[class*="cardName"]');
        if (await cn.count()) names.push((await cn.first().innerText()).trim());
      }
      return { value: names[0] || null, raw: { pressedCardNames: names } };
    });
    return { observations: { theme, language, permission, font, scene } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 读取主题影响表面的 computed background-color。
export async function readSurfaceBg(ctx) {
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const bg = await rec.read('主题影响表面背景色', 'settings-surface-bg', { channel: 'dom', scope: '应用主表面(body)', locator: 'body' }, async () => {
      const value = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      return { value, raw: { backgroundColor: value } };
    });
    return { observations: { bg } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 设置主题（浅色/深色/跟随系统）。
export async function setTheme(ctx, args = {}) {
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await gotoTab(page, page, '常规');
    const act = await rec.action('设置主题', 'click', { value: args.value }, async () => {
      await page.locator(`${D} button[aria-pressed]`).filter({ hasText: args.value }).first().click();
      await page.waitForTimeout(1200);
    });
    const after = await rec.read('主题改后值', 'settings-theme', { channel: 'dom', scope: '设置/常规/外观', locator: `${D} button[aria-pressed]` }, async () => {
      const r = await readPressedText(page, ['浅色', '深色', '跟随系统']);
      return { value: r.value, raw: { pressedTexts: r.texts } };
    });
    return { action_refs: [act.event_id], observations: { after } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 设置语言。
export async function setLanguage(ctx, args = {}) {
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await gotoTab(page, page, '常规');
    const act = await rec.action('设置语言', 'select', { value: args.value }, async () => {
      await page.locator('button[class*="hVGvvW_selector"]').first().click();
      await page.waitForTimeout(700);
      await page.getByText(args.value, { exact: true }).last().click();
      await page.waitForTimeout(1200);
    });
    return { action_refs: [act.event_id], observations: {} };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 读取常规项在英文下的显示（用于语言效果）。
export async function readGeneralNav(ctx, args = {}) {
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const nav = await rec.read('设置导航语言', 'settings-nav', { channel: 'dom', scope: '设置/左侧导航', locator: `${D} button[class*="navCell"]` }, async () => {
      const texts = (await page.locator(`${D} button[class*="navCell"]`).allInnerTexts()).map((t) => t.trim());
      const hasGeneral = texts.includes('General');
      return { value: hasGeneral ? 'General' : (texts.find((t) => t === '常规') || texts[0] || null), raw: { navTexts: texts } };
    });
    return { observations: { nav } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 设置默认权限。
export async function setPermission(ctx, args = {}) {
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await gotoTab(page, page, '常规');
    const act = await rec.action('设置默认权限', 'select', { value: args.value }, async () => {
      await page.locator('button[class*="oY77xG_selector"]').first().click();
      await page.waitForTimeout(700);
      await page.getByText(args.value, { exact: true }).last().click();
      await page.waitForTimeout(1200);
    });
    const after = await rec.read('默认权限改后值', 'settings-permission', { channel: 'dom', scope: '设置/常规/权限', locator: 'button[class*="oY77xG_selector"]' }, async () => {
      const v = (await page.locator('button[class*="oY77xG_selector"]').first().innerText()).trim();
      return { value: v, raw: { value: v } };
    });
    return { action_refs: [act.event_id], observations: { after } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 调整字号（delta 次增大/减小），返回改后数值。
export async function setFontDelta(ctx, args = {}) {
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await gotoTab(page, page, '常规');
    const delta = args.delta ?? 1;
    const sel = delta > 0 ? 'button[aria-label="增大字号"]' : 'button[aria-label="减小字号"]';
    const act = await rec.action('调整字号', 'click', { delta }, async () => {
      for (let i = 0; i < Math.abs(delta); i++) { await page.locator(sel).first().click(); await page.waitForTimeout(500); }
      await page.waitForTimeout(600);
    });
    const after = await rec.read('字号改后数值', 'settings-font', { channel: 'dom', scope: '设置/常规/字号', locator: 'button[aria-label="增大字号"]' }, async () => {
      const cssVar = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--dsh-content-font-size').trim());
      return { value: parseInt(cssVar, 10), raw: { cssVar } };
    });
    return { action_refs: [act.event_id], observations: { after } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 设置场景预设（标准模式/PTC 模式/工厂模式）。
export async function setScene(ctx, args = {}) {
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await gotoTab(page, page, '场景预设');
    const act = await rec.action('设置场景预设', 'click', { value: args.value }, async () => {
      await page.locator(`${D} button[class*="cardMain"]`).filter({ hasText: args.value }).first().click();
      await page.waitForTimeout(1500);
    });
    const after = await rec.read('场景改后值', 'settings-scene', { channel: 'dom', scope: '设置/场景预设', locator: `${D} button[aria-pressed="true"] [class*="cardName"]` }, async () => {
      const btns = page.locator(`${D} button[aria-pressed="true"]`);
      const n = await btns.count();
      const names = [];
      for (let i = 0; i < n; i++) { const cn = btns.nth(i).locator('[class*="cardName"]'); if (await cn.count()) names.push((await cn.first().innerText()).trim()); }
      return { value: names[0] || null, raw: { pressedCardNames: names } };
    });
    return { action_refs: [act.event_id], observations: { after } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 关闭设置弹窗。
export async function closeSettings(ctx) {
  const conn = await connect(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('关闭设置', 'click', null, async () => {
      const close = page.locator(`${D} button`).filter({ hasText: '关闭' }).first();
      if (await close.count()) await close.click(); else await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    });
    return { action_refs: [act.event_id], observations: {} };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 读取当前空白任务 composer 的权限与场景标签。
export async function readComposerLabels(ctx) {
  const conn = await connect(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const permission = await rec.read('当前任务权限标签', 'composer-permission', { channel: 'dom', scope: 'composer 访问模式按钮', locator: 'button[aria-label^="访问模式"]' }, async () => {
      const v = (await page.locator('button[aria-label^="访问模式"]').first().innerText()).trim();
      return { value: v, raw: { value: v } };
    });
    const scene = await rec.read('当前任务场景标签', 'composer-scene', { channel: 'dom', scope: 'composer 场景按钮', locator: 'button[class*="seat"], [class*="seatButton"], [data-slot="conversation.hero.agentPreset"] button' }, async () => {
      const cand = page.locator('button[class*="seat"], [class*="seatButton"], [data-slot="conversation.hero.agentPreset"] button');
      const n = await cand.count();
      const texts = n ? (await cand.allInnerTexts()).map((t) => t.trim()).filter(Boolean) : [];
      return { value: texts.length ? texts[0] : null, raw: { count: n, texts } };
    });
    const font = await rec.read('新会话助手正文字号', 'composer-font', { channel: 'dom', scope: '助手正文', locator: '[class*="hWmORq_body"]' }, async () => {
      const v = await page.evaluate(() => { const el = document.querySelector('[class*="hWmORq_body"]'); return el ? getComputedStyle(el).fontSize : null; });
      return { value: v ? parseFloat(v) : null, raw: { fontSize: v } };
    });
    return { observations: { permission, scene, font } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 读取某设置行内的开关 aria-checked。
export async function readSwitch(ctx, args = {}) {
  const { section, label } = args;
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await gotoTab(page, page, section);
    const read = await rec.read('设置开关状态', 'settings-switch', { channel: 'dom', scope: `设置/${section}/${label}`, locator: `${D} [role="switch"]` }, async () => {
      const row = page.locator(`${D} [class*="row"]`).filter({ hasText: label }).first();
      const sw = row.locator('[role="switch"]').first();
      const n = await sw.count();
      const aria = n ? await sw.getAttribute('aria-checked') : null;
      return { value: parseBoolean(aria), raw: { count: n, aria_checked: aria, label }, derivation: "aria_checked === 'true'" };
    });
    return { observations: { read } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 切换某设置行内的开关并回读。
export async function setSwitch(ctx, args = {}) {
  const { section, label } = args;
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await gotoTab(page, page, section);
    const row = page.locator(`${D} [class*="row"]`).filter({ hasText: label }).first();
    const before = await rec.read('设置开关(改前)', 'settings-switch', { channel: 'dom', scope: `设置/${section}/${label}`, locator: `${D} [role="switch"]` }, async () => {
      const aria = await row.locator('[role="switch"]').first().getAttribute('aria-checked');
      return { value: parseBoolean(aria), raw: { aria_checked: aria, label }, derivation: "aria_checked === 'true'" };
    });
    const act = await rec.action('切换设置开关', 'click', { section, label }, async () => { await row.locator('[role="switch"]').first().click(); await page.waitForTimeout(1200); });
    const after = await rec.read('设置开关(改后)', 'settings-switch', { channel: 'dom', scope: `设置/${section}/${label}`, locator: `${D} [role="switch"]` }, async () => {
      const aria = await row.locator('[role="switch"]').first().getAttribute('aria-checked');
      return { value: parseBoolean(aria), raw: { aria_checked: aria, label }, derivation: "aria_checked === 'true'" };
    });
    const switched = before.value !== after.value;
    return { action_refs: [act.event_id], observations: { before, after, switched } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 读取某设置行的选择器文本值。
export async function readSelect(ctx, args = {}) {
  const { section, label } = args;
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await gotoTab(page, page, section);
    const read = await rec.read('设置选择值', 'settings-select', { channel: 'dom', scope: `设置/${section}/${label}`, locator: `${D} button[class*="selector"]` }, async () => {
      const row = page.locator(`${D} [class*="row"]`).filter({ hasText: label }).first();
      const sel = row.locator('button[class*="selector"]').first();
      const n = await sel.count();
      const value = n ? (await sel.innerText()).trim() : null;
      return { value, raw: { count: n, value, label } };
    });
    return { observations: { read } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 设置某设置行的选择值。
export async function setSelect(ctx, args = {}) {
  const { section, label, value } = args;
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await gotoTab(page, page, section);
    const act = await rec.action('设置选择值', 'select', { section, label, value }, async () => {
      const row = page.locator(`${D} [class*="row"]`).filter({ hasText: label }).first();
      await row.locator('button[class*="selector"]').first().click();
      await page.waitForTimeout(700);
      await page.getByText(value, { exact: true }).last().click();
      await page.waitForTimeout(1200);
    });
    const after = await rec.read('设置选择(改后)', 'settings-select', { channel: 'dom', scope: `设置/${section}/${label}`, locator: `${D} button[class*="selector"]` }, async () => {
      const row = page.locator(`${D} [class*="row"]`).filter({ hasText: label }).first();
      const v = (await row.locator('button[class*="selector"]').first().innerText()).trim();
      return { value: v, raw: { value: v, label } };
    });
    return { action_refs: [act.event_id], observations: { after } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 按分区内索引读取开关 aria-checked。
export async function readSwitchIndex(ctx, args = {}) {
  const { section, index } = args;
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await gotoTab(page, page, section);
    const read = await rec.read('设置开关状态(按索引)', 'settings-switch-index', { channel: 'dom', scope: `设置/${section}#${index}`, locator: `${D} [role="switch"]` }, async () => {
      const sws = page.locator(`${D} [role="switch"]`);
      await sws.first().waitFor({ state: 'attached', timeout: 8000 });
      const n = await sws.count();
      const aria = index < n ? await sws.nth(index).getAttribute('aria-checked') : null;
      return { value: parseBoolean(aria), raw: { count: n, index, aria_checked: aria }, derivation: "aria_checked === 'true'" };
    });
    return { observations: { read } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 按分区内索引切换开关并回读。
export async function setSwitchIndex(ctx, args = {}) {
  const { section, index } = args;
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await gotoTab(page, page, section);
    const sws = page.locator(`${D} [role="switch"]`);
    await sws.first().waitFor({ state: 'attached', timeout: 8000 });
    await page.waitForTimeout(500);
    const before = await rec.read('设置开关按索引(改前)', 'settings-switch-index', { channel: 'dom', scope: `设置/${section}#${index}`, locator: `${D} [role="switch"]` }, async () => {
      const aria = await sws.nth(index).getAttribute('aria-checked');
      return { value: parseBoolean(aria), raw: { aria_checked: aria, index }, derivation: "aria_checked === 'true'" };
    });
    const act = await rec.action('切换设置开关(按索引)', 'click', { section, index }, async () => { await sws.nth(index).click(); await page.waitForTimeout(1200); });
    const after = await rec.read('设置开关按索引(改后)', 'settings-switch-index', { channel: 'dom', scope: `设置/${section}#${index}`, locator: `${D} [role="switch"]` }, async () => {
      const aria = await sws.nth(index).getAttribute('aria-checked');
      return { value: parseBoolean(aria), raw: { aria_checked: aria, index }, derivation: "aria_checked === 'true'" };
    });
    return { action_refs: [act.event_id], observations: { before, after } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 按设置行标签读取开关/复选框状态（支持 role=switch 或 input[type=checkbox]）。
export async function readRowToggle(ctx, args = {}) {
  const { section, label } = args;
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await gotoTab(page, page, section);
    const read = await rec.read('设置行开关状态', 'settings-row-toggle', { channel: 'dom', scope: `设置/${section}/${label}`, locator: `${D} [role="switch"], ${D} input[type="checkbox"]` }, async () => {
      const row = page.locator(`${D} [class*="row"], ${D} [class*="cfg-row"]`).filter({ hasText: label }).first();
      const ctl = row.locator('[role="switch"], input[type="checkbox"]').first();
      const n = await ctl.count();
      let value = null; const raw = { count: n, label };
      if (n) {
        const tag = await ctl.evaluate((e) => e.tagName);
        if (tag === 'INPUT') { value = await ctl.isChecked(); raw.checked = value; raw.kind = 'checkbox'; }
        else { const aria = await ctl.getAttribute('aria-checked'); value = parseBoolean(aria); raw.aria_checked = aria; raw.kind = 'switch'; }
      }
      return { value, raw, derivation: 'checkbox.checked 或 aria-checked' };
    });
    return { observations: { read } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 按设置行标签切换开关/复选框并回读。
export async function setRowToggle(ctx, args = {}) {
  const { section, label } = args;
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await gotoTab(page, page, section);
    const row = page.locator(`${D} [class*="row"], ${D} [class*="cfg-row"]`).filter({ hasText: label }).first();
    const ctl = row.locator('[role="switch"], input[type="checkbox"]').first();
    const readState = async () => {
      const tag = await ctl.evaluate((e) => e.tagName);
      if (tag === 'INPUT') return ctl.isChecked();
      return parseBoolean(await ctl.getAttribute('aria-checked'));
    };
    const before = await rec.read('设置行开关(改前)', 'settings-row-toggle', { channel: 'dom', scope: `设置/${section}/${label}`, locator: `${D} [role="switch"], ${D} input[type="checkbox"]` }, async () => { const v = await readState(); return { value: v, raw: { value: v, label } }; });
    const act = await rec.action('切换设置行开关', 'click', { section, label }, async () => {
      const clickable = row.locator('label, [class*="cfg-label"]').first();
      if (await clickable.count()) await clickable.click(); else await ctl.click();
      await page.waitForTimeout(1200);
    });
    const after = await rec.read('设置行开关(改后)', 'settings-row-toggle', { channel: 'dom', scope: `设置/${section}/${label}`, locator: `${D} [role="switch"], ${D} input[type="checkbox"]` }, async () => { const v = await readState(); return { value: v, raw: { value: v, label } }; });
    return { action_refs: [act.event_id], observations: { before, after } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 读取设置区可见的保存失败/错误提示。
export async function readToastError(ctx) {
  const conn = await connect(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const read = await rec.read('设置保存失败提示', 'settings-toast-error', { channel: 'dom', scope: '应用主表面/提示', locator: '[role="alert"],[class*="toast"],[class*="error"]' }, async () => {
      const texts = await page.evaluate(() => {
        const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        return [...document.querySelectorAll('[role="alert"],[class*="toast"],[class*="error"]')].filter(vis).map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
      });
      const fail = texts.some((t) => /(保存失败|失败|错误|无效|error)/i.test(t));
      return { value: fail, raw: { texts }, derivation: '存在保存失败/错误提示' };
    });
    return { observations: { read } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 关闭设置/快捷键等顶层弹窗，保持环境干净。
async function closeAllDialogs(page) {
  for (let i = 0; i < 4; i++) {
    const n = await page.locator('[data-shortcut-modal]').count();
    if (!n) break;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
}

// 打开快捷键编辑器。
async function openShortcutEditor(page, ctx) {
  const dlg = page.locator('[data-shortcut-modal="settings"]');
  if (!(await dlg.count())) {
    await page.locator('button', { hasText: ctx.environment.account_name }).first().click();
    await page.waitForTimeout(700);
    await page.getByText('设置', { exact: true }).first().click();
    await page.waitForTimeout(1200);
  }
  await dlg.locator('button[class*="navCell"]').filter({ hasText: '常规' }).first().click();
  await page.waitForTimeout(700);
  await dlg.getByText('编辑快捷键', { exact: true }).first().click();
  await page.waitForTimeout(1200);
}

// 读取某快捷键的规范化绑定文本。
export async function readShortcut(ctx, args = {}) {
  const { label } = args;
  const conn = await connect(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await openShortcutEditor(page, ctx);
    const read = await rec.read('快捷键绑定', 'settings-shortcut', { channel: 'dom', scope: `快捷键/${label}`, locator: '[data-shortcut-modal="shortcuts"] li' }, async () => {
      const row = page.locator('[data-shortcut-modal="shortcuts"] li').filter({ hasText: label }).first();
      const raw = await row.locator('[class*="binding"]').first().innerText();
      const value = raw.replace(/\s+/g, '');
      return { value, raw: { text: raw, label }, derivation: '去除空白得到规范化组合' };
    });
    return { observations: { read } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 录制并保存某快捷键的绑定。
export async function setShortcut(ctx, args = {}) {
  const { label, combo } = args;
  const conn = await connect(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    await openShortcutEditor(page, ctx);
    const row = page.locator('[data-shortcut-modal="shortcuts"] li').filter({ hasText: label }).first();
    const btn = row.locator('button[aria-label*="修改"]').first();
    const act = await rec.action('录制新快捷键', 'click-and-key', { label, combo }, async () => {
      await btn.click();
      await page.waitForTimeout(500);
      for (const k of combo) await page.keyboard.down(k);
      for (const k of [...combo].reverse()) await page.keyboard.up(k);
      await page.waitForTimeout(700);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(900);
    });
    const after = await rec.read('快捷键绑定(改后)', 'settings-shortcut', { channel: 'dom', scope: `快捷键/${label}`, locator: '[data-shortcut-modal="shortcuts"] li' }, async () => {
      const raw = await row.locator('[class*="binding"]').first().innerText();
      const value = raw.replace(/\s+/g, '');
      return { value, raw: { text: raw, label }, derivation: '去除空白得到规范化组合' };
    });
    return { action_refs: [act.event_id], observations: { after } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 读取个人主页身份字段（用户名/用户类型）是否均只读。
export async function readProfileIdentity(ctx) {
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const act = await rec.action('打开个人主页设置', 'click-nav', null, async () => { await gotoTab(page, page, '个人主页'); });
    const read = await rec.read('用户名与用户类型只读', 'settings-profile-identity', { channel: 'dom', scope: '设置/个人主页', locator: '[data-shortcut-modal="settings"] input' }, async () => {
      const info = await page.evaluate(() => {
        const d = document.querySelector('[data-shortcut-modal="settings"]');
        const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        return [...d.querySelectorAll('input')].filter(vis).map((e) => ({ value: (e.value || '').slice(0, 30), disabled: e.disabled, readOnly: e.readOnly }));
      });
      const both = info.length >= 2 && info.slice(0, 2).every((i) => i.disabled || i.readOnly);
      return { value: both, raw: { inputs: info }, derivation: '用户名与用户类型均 disabled/readonly' };
    });
    return { action_refs: [act.event_id], observations: { read } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}

// 读取本轮可逆设置的规范化快照（含主题/语言/字号/权限/工作步骤/用量/链接/代码工具/记忆/沉淀/实验/开发者/快捷键）。
export async function readSnapshot(ctx) {
  const conn = await openSettings(ctx);
  try {
    const { page } = conn;
    const rec = ctx.recorder;
    const D2 = '[data-shortcut-modal="settings"]';
    const act = await rec.action('打开设置读取快照', 'click-nav', null, async () => { await page.waitForTimeout(400); });
    const readSelectRow = async (section, label) => {
      await gotoTab(page, page, section);
      const row = page.locator(`${D2} [class*="row"], ${D2} [class*="cfg-row"]`).filter({ hasText: label }).first();
      const sel = row.locator('button[class*="selector"]').first();
      if (await sel.count()) return (await sel.innerText()).trim();
      const sw = row.locator('[role="switch"], input[type="checkbox"]').first();
      if (await sw.count()) {
        const tag = await sw.evaluate((e) => e.tagName);
        if (tag === 'INPUT') return await sw.isChecked();
        return (await sw.getAttribute('aria-checked')) === 'true';
      }
      return null;
    };
    const fields = {}, errors = [];
    await gotoTab(page, page, '常规');
    fields['主题'] = (await readPressedText(page, ['浅色','深色','跟随系统'])).value;
    fields['字号'] = await page.locator(`${D2} [class*="row"], ${D2} [class*="cfg-row"]`).filter({ hasText: '字号大小' }).first().evaluate((el) => { const m = /(\d+)\s*px/.exec(el.innerText || ''); return m ? m[1] : null; }).catch(e => { errors.push({message:e.message}); return null; });
    fields['语言'] = await readSelectRow('常规', '语言');
    fields['默认权限'] = await readSelectRow('常规', '权限');
    fields['工作步骤展示'] = await readSelectRow('常规', '工作步骤展示');
    fields['性能与用量'] = await readSelectRow('常规', '性能与用量');
    fields['网页链接默认打开方式'] = await readSelectRow('常规', '网页链接默认打开方式');
    fields['代码工作工具'] = await readSelectRow('常规', '代码工作工具');
    fields['启用记忆'] = await readSelectRow('记忆与进化', '启用记忆');
    fields['启用沉淀'] = await readSelectRow('记忆与进化', '启用沉淀');
    const expSw = page.locator(`${D2} [role="switch"]`);
    await gotoTab(page, page, '实验性功能');
    fields['实验性功能'] = await expSw.first().getAttribute('aria-checked').then((a) => parseBoolean(a)).catch(e => { errors.push({message:e.message}); return null; });
    await gotoTab(page, page, '开发者模式');
    fields['开发者模式'] = await expSw.first().getAttribute('aria-checked').then((a) => parseBoolean(a)).catch(e => { errors.push({message:e.message}); return null; });
    await gotoTab(page, page, '常规');
    await page.locator(D2).getByText('编辑快捷键', { exact: true }).first().click();
    await page.waitForTimeout(1200);
    const sc = page.locator('[data-shortcut-modal="shortcuts"]');
    const readBinding = async (label) => { const row = sc.locator('li').filter({ hasText: label }).first(); const raw = await row.locator('[class*="binding"]').first().innerText(); return raw.replace(/\s+/g, ''); };
    fields['新会话快捷键'] = await readBinding('新会话');
    fields['搜索会话快捷键'] = await readBinding('搜索会话');
    const read = await rec.read('本轮设置规范化快照', 'settings-snapshot', { channel: 'dom', scope: '设置/全部分区', locator: D2 }, async () => ({ value: fields, raw: { fields, errors }, derivation: '逐项读取本轮可逆设置字段' }));
    return { action_refs: [act.event_id], observations: { read, fields } };
  } finally { await closeAllDialogs(conn.page); await conn.close(); }
}
