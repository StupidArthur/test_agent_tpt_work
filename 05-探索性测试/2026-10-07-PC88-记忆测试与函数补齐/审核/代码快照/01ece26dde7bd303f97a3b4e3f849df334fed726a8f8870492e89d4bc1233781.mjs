// 任务业务函数：记忆与进化专项（PC88）
import { openMemoryPanel, openMemorySettings, dumpSurface, readSettingRows, closeTopDialogs } from '../automation/memory.mjs';

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
