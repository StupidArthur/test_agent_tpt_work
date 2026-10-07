// 任务业务函数：记忆与进化专项（PC88）
import { openMemoryPanel, openMemorySettings, dumpSurface, readSettingRows, readMemorySurface, readDialogs, clickText, closeTopDialogs } from '../automation/memory.mjs';

// 探针：枚举记忆面板与设置记忆分区结构，供本轮定位用
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

// 探针：切 tab / 打开编辑弹窗 / 高级设置，读取实际结构
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
    } else if (action === 'library') {
      await clickText(page, '记忆库', 1200);
      obs.library = await ctx.recorder.read('记忆库内容', 'memory-library', { channel: 'dom', scope: '设置/记忆与进化/记忆库' }, async () => ({ value: await readMemorySurface(page), raw: {} }));
    } else if (action === 'advanced') {
      await clickText(page, '高级设置', 1200);
      obs.advanced = await ctx.recorder.read('高级设置弹窗', 'memory-advanced', { channel: 'dom', scope: '记忆与进化/高级设置' }, async () => ({ value: await readDialogs(page), raw: {} }));
    } else if (action === 'edit') {
      const idx = args.index ?? 0;
      const btns = page.locator(`${'[data-shortcut-modal="settings"]'} button`).filter({ hasText: '编辑' });
      await btns.nth(idx).click();
      await page.waitForTimeout(1500);
      obs.edit = await ctx.recorder.read('分层文件编辑弹窗', 'memory-edit-' + idx, { channel: 'dom', scope: '记忆与进化/编辑' }, async () => ({ value: await readDialogs(page), raw: {} }));
    }
    return { observations: obs };
  } finally { await closeTopDialogs(page); await conn.close?.(); }
}
