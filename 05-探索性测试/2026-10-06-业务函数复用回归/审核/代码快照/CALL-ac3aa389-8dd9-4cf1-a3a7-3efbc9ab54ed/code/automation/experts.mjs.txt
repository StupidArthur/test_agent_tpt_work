// 软件操作支撑层：专家页 iframe 定位与交互原语。
import { connect } from './session.mjs';

export const EXPERT_SEL = {
  navItem: 'button[aria-label="专家"]',
  frameUrlPart: 'supcon-agents',
  importBtn: '导入专家',
  search: 'input[placeholder="搜索我的专家"]',
  dialog: '[role="dialog"]',
  dirInput: 'input[type="file"][webkitdirectory]',
  zipInput: 'input[type="file"][accept*=".zip"]',
  card: 'div[class*="_card_"]',
  cardTitle: 'h3',
};

export async function connectExperts(ctx) {
  const conn = await connect(ctx);
  let frame = conn.page.frames().find((f) => f.url().includes(EXPERT_SEL.frameUrlPart));
  if (!frame) {
    await conn.page.locator(EXPERT_SEL.navItem).first().click();
    await conn.page.waitForTimeout(1500);
    frame = conn.page.frames().find((f) => f.url().includes(EXPERT_SEL.frameUrlPart));
  }
  if (!frame) { await conn.close(); throw new Error('未找到专家 iframe'); }
  if (await frame.locator('[class*="dir-preview"]').count()) {
    const crumb = frame.locator('[class*="page-top"]').getByText('专家', { exact: true }).first();
    await crumb.click().catch(() => {});
    await conn.page.waitForTimeout(1000);
  }
  // 专家详情为整页视图（含 data-slot=markdown 提示词）；返回列表。
  if ((await frame.locator('div[class*="_card_"]').count()) === 0 && (await frame.locator('[data-slot="markdown"]').count()) > 0) {
    const crumb = frame.locator('[class*="page-top"], header').getByText('专家', { exact: true }).first();
    await crumb.click().catch(() => {});
    await conn.page.waitForTimeout(1000);
  }
  return { ...conn, frame };
}

export function cardByTitle(frame, title) {
  return frame.locator(EXPERT_SEL.card).filter({ has: frame.locator(EXPERT_SEL.cardTitle, { hasText: title }) }).first();
}
