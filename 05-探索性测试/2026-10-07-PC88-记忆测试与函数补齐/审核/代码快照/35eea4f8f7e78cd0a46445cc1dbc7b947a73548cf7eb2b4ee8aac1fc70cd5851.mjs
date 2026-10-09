// 任务业务函数：记忆与进化专项（PC88）
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { openMemoryPanel, openMemorySettings, dumpSurface, readSettingRows, readMemorySurface, readDialogs, readAdvancedRows, clickText, closeTopDialogs, SETTINGS } from '../automation/memory.mjs';

const sha = (data) => crypto.createHash('sha256').update(data).digest('hex');

// 探针：枚举记忆面板与设置记忆分区结构
export async function inspectSurfaces(ctx) {
  const conn = await openMemoryPanel(ctx);
  try {
    const panel = await ctx.recorder.read('记忆与进化面板结构', 'memory-panel', { channel: 'dom', scope: '头像菜单/记忆与进化' }, async () => ({ value: await dumpSurface(conn.page), raw: {} }));
    await closeTopDialogs(conn.page);
    const sconn = await openMemorySettings(ctx);
    try {
      const settings = await ctx.recorder.read('设置记忆与进化分区行', 'memory-settings-rows', { channel: 'dom', scope: '设置/记忆与进化' }, async () => ({ value: await readSettingRows(sconn.page), raw: {} }));
      return { observations: { panel, settings } };
    } finally { await closeTopDialogs(sconn.page); await sconn.close(); }
  } finally { await ctx.connection?.close?.(); }
}

// 探针：切 tab / 打开编辑弹窗 / 高级设置
export async function probePanel(ctx, args = {}) {
  const action = args.action;
  const conn = await openMemoryPanel(ctx);
  const { page } = conn;
  try {
    const obs = {};
    if (action === 'tabs') {
      for (const tab of ['记忆库', '日志', '概览']) {
        await clickText(page, tab, 1200);
        obs[tab] = await ctx.recorder.read(`记忆面板 ${tab} 内容`, 'memory-tab-' + tab, { channel: 'dom', scope: `设置/记忆与进化/${tab}` }, async () => ({ value: await readMemorySurface(page), raw: {} }));
      }
    } else if (action === 'rows') {
      await clickText(page, '记忆库', 1200);
      obs.rows = await ctx.recorder.read('记忆库行与控件', 'memory-library-rows', { channel: 'dom', scope: '设置/记忆与进化/记忆库/行' }, async () => ({
        value: await page.evaluate((sel) => {
          const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          const root = document.querySelector(sel);
          const rows = [...root.querySelectorAll('tr,[class*="row"],[class*="item"]')].filter(vis).map((r) => ({
            text: (r.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200),
            buttons: [...r.querySelectorAll('button')].filter(vis).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim()),
            inputs: [...r.querySelectorAll('input,textarea')].map((i) => ({ type: i.type, value: i.value })),
            html: r.outerHTML.slice(0, 400),
          })).filter((x) => x.text);
          return rows;
        }, SETTINGS),
        raw: {},
      }));
    } else if (action === 'library') {
      await clickText(page, '记忆库', 1200);
      obs.library = await ctx.recorder.read('记忆库内容', 'memory-library', { channel: 'dom', scope: '设置/记忆与进化/记忆库' }, async () => ({ value: { surface: await readMemorySurface(page), dom: await dumpSurface(page, SETTINGS) }, raw: {} }));
    } else if (action === 'advanced') {
      await clickText(page, '高级设置', 1200);
      obs.advanced = await ctx.recorder.read('高级设置弹窗', 'memory-advanced', { channel: 'dom', scope: '记忆与进化/高级设置' }, async () => ({ value: await readDialogs(page), raw: {} }));
    } else if (action === 'edit') {
      const idx = args.index ?? 0;
      const btns = page.locator(`${SETTINGS} button`).filter({ hasText: '编辑' });
      await btns.nth(idx).click();
      await page.waitForTimeout(1500);
      obs.edit = await ctx.recorder.read('分层文件编辑弹窗', 'memory-edit-' + idx, { channel: 'dom', scope: '记忆与进化/编辑' }, async () => ({ value: await readDialogs(page), raw: {} }));
    }
    return { observations: obs };
  } finally { await closeTopDialogs(page); await conn.close?.(); }
}

// 读取概览计数、开关与高级设置实际参数
export async function readOverview(ctx) {
  const conn = await openMemoryPanel(ctx);
  const { page } = conn;
  try {
    const overview = await ctx.recorder.read('记忆概览文本与开关', 'memory-overview', { channel: 'dom', scope: '设置/记忆与进化/概览' }, async () => {
      const s = await readMemorySurface(page);
      return { value: { text: s.text, toggles: s.inputs.filter((i) => i.type === 'checkbox') }, raw: {} };
    });
    await clickText(page, '高级设置', 1200);
    const advanced = await ctx.recorder.read('高级设置实际参数值', 'memory-advanced-values', { channel: 'dom', scope: '记忆与进化/高级设置' }, async () => ({ value: await readAdvancedRows(page), raw: {} }));
    return { observations: { overview, advanced } };
  } finally { await closeTopDialogs(page); await conn.close?.(); }
}

// 文件取证：枚举记忆目录与读取文件内容/哈希
export async function readFiles(ctx, args = {}) {
  const root = path.resolve(args.path || ctx.environment.memory_root);
  const obs = {};
  obs.tree = await ctx.recorder.read('记忆目录枚举', root, { channel: 'file', scope: root }, async () => {
    if (!fs.existsSync(root)) return { value: null, raw: { exists: false, path: root } };
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(d, e.name);
      return e.isDirectory() ? [{ rel: path.relative(root, p), kind: 'dir' }, ...walk(p)] : [{ rel: path.relative(root, p), kind: 'file', bytes: fs.statSync(p).size }];
    });
    return { value: walk(root), raw: { root } };
  });
  const files = args.files || ['SOUL.md', 'AGENTS.md', 'USER.md', 'MEMORY.md', 'index.json', 'audit.jsonl', '.reflection-state.json'];
  for (const rel of files) {
    const p = path.join(root, rel);
    obs[rel] = await ctx.recorder.read('记忆文件内容与哈希', p, { channel: 'file', scope: p }, async () => {
      if (!fs.existsSync(p)) return { value: null, raw: { exists: false, path: p } };
      const data = fs.readFileSync(p);
      return { value: { text: data.toString('utf8'), sha256: sha(data), bytes: data.length }, raw: { exists: true, path: p, mtime: fs.statSync(p).mtime.toISOString() } };
    });
  }
  return { observations: obs };
}

// 添加自定义记忆条目（记忆库 → 类型 → 内容 → 添加），并回读面板与落盘
export async function addEntry(ctx, args = {}) {
  const conn = await openMemoryPanel(ctx);
  const { page } = conn;
  const D = SETTINGS;
  try {
    await clickText(page, '记忆库', 1200);
    const type = args.type || '事实';
    const addSelect = page.locator(`${D} select.tpt-select`).last();
    await ctx.recorder.action('选择记忆类型', 'select', { type }, async () => { await addSelect.selectOption({ label: type }); await page.waitForTimeout(500); });
    const addInput = page.locator(`${D} input.tpt-input`).last();
    await ctx.recorder.action('填写记忆内容', 'fill', { content: args.content }, async () => { await addInput.click(); await addInput.fill(args.content); await page.waitForTimeout(300); });
    await ctx.recorder.action('点击添加', 'click', null, async () => { await page.locator(`${D} button.tpt-btn-primary`).first().click(); await page.waitForTimeout(1800); });
    const after = await ctx.recorder.read('添加后记忆库内容', 'memory-library-after-add', { channel: 'dom', scope: '设置/记忆与进化/记忆库' }, async () => ({ value: await readMemorySurface(page), raw: {} }));
    return { observations: { after } };
  } finally { await closeTopDialogs(page); await conn.close?.(); }
}

// 编辑分层记忆文件（概览 → 编辑 → 弹窗），返回改前/改后
export async function editLayerFile(ctx, args = {}) {
  const conn = await openMemoryPanel(ctx);
  const { page } = conn;
  const D = SETTINGS;
  try {
    await clickText(page, '概览', 1000);
    const idx = args.index ?? 0;
    const editBtns = page.locator(`${D} button`).filter({ hasText: '编辑' });
    await ctx.recorder.action('打开分层文件编辑', 'click', { index: idx }, async () => { await editBtns.nth(idx).click(); await page.waitForTimeout(1500); });
    const modal = page.locator('.tpt-modal').last();
    const head = (await modal.locator('.tpt-modal-head').innerText().catch(() => '')).trim();
    const path = (await modal.locator('.tpt-modal-path').innerText().catch(() => '')).trim();
    const ta = modal.locator('textarea, input').first();
    const before = await ctx.recorder.read('分层文件编辑(改前)', 'memory-layer-edit-' + idx, { channel: 'dom', scope: `记忆与进化/编辑/${head}` }, async () => { const v = await ta.inputValue(); return { value: v, raw: { head, path } }; });
    await ctx.recorder.action('填写分层文件内容', 'fill', { content: args.content }, async () => { await ta.click(); await ta.fill(args.content); await page.waitForTimeout(400); });
    await ctx.recorder.action('保存分层文件', 'click', null, async () => { await modal.locator('button').filter({ hasText: /^保存$/ }).first().click(); await page.waitForTimeout(2000); });
    const after = await ctx.recorder.read('分层文件编辑(改后)', 'memory-layer-edit-' + idx, { channel: 'dom', scope: `记忆与进化/编辑/${head}` }, async () => {
      const dialogGone = !(await page.locator('.tpt-modal').count());
      return { value: { dialogClosed: dialogGone }, raw: { panelText: (await page.locator(D).innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400) } };
    });
    return { action_refs: [before.event_id], observations: { head, path, before, after } };
  } finally { await closeTopDialogs(page); await conn.close?.(); }
}


export async function setAdvanced(ctx, args = {}) {
  const conn = await openMemoryPanel(ctx);
  const { page } = conn;
  try {
    await clickText(page, '高级设置', 1200);
    const label = args.label;
    const row = page.locator(`${D} [class*="cfg-row"], ${D} [class*="row"], ${D} label`).filter({ hasText: label }).first();
    const input = row.locator('input').first();
    const before = await ctx.recorder.read('高级参数(改前)', 'memory-advanced-' + label, { channel: 'dom', scope: `记忆与进化/高级设置/${label}` }, async () => { await input.scrollIntoViewIfNeeded().catch(() => {}); const v = await input.inputValue(); return { value: v, raw: { label } }; });
    await ctx.recorder.action('修改高级参数', 'fill', { label, value: args.value }, async () => { await input.click(); await input.fill(String(args.value)); await page.waitForTimeout(400); });
    await ctx.recorder.action('保存高级参数', 'click', null, async () => { await page.locator(`${D} button`).filter({ hasText: /^保存$/ }).first().click(); await page.waitForTimeout(1800); });
    const after = await ctx.recorder.read('高级参数(改后)', 'memory-advanced-' + label, { channel: 'dom', scope: `记忆与进化/高级设置/${label}` }, async () => { const v = await input.inputValue(); return { value: v, raw: { label } }; });
    return { action_refs: [before.event_id, after.event_id], observations: { before, after } };
  } finally { await closeTopDialogs(page); await conn.close?.(); }
}
