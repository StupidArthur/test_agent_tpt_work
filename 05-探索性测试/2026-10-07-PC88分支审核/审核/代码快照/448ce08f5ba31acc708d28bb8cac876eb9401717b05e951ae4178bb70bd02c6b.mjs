// 软件操作支撑层：专家页 iframe 定位与交互原语。
import { connect } from './session.mjs';
import {openSidebarAction} from './navigation.mjs';

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

export async function connectExperts(ctx, { preserveView = false } = {}) {
  const conn = await connect(ctx);
  let frame = conn.page.frames().find((f) => f.url().includes(EXPERT_SEL.frameUrlPart));
  if (!frame) {
    await openSidebarAction(conn.page,'专家');
    await conn.page.waitForTimeout(1500);
    frame = conn.page.frames().find((f) => f.url().includes(EXPERT_SEL.frameUrlPart));
  }
  if (!frame) { await conn.close(); throw new Error('未找到专家 iframe'); }
  if (!preserveView && await frame.locator('[class*="dir-preview"]').count()) {
    const crumb = frame.locator('[class*="page-top"]').getByText('专家', { exact: true }).first();
    await crumb.click();
    await conn.page.waitForTimeout(1000);
  }
  // 专家详情为整页视图（含 data-slot=markdown 提示词）；返回列表。
  if (!preserveView && (await frame.locator('div[class*="_card_"]').count()) === 0 && (await frame.locator('[data-slot="markdown"]').count()) > 0) {
    const crumb = frame.locator('[class*="page-top"], header').getByText('专家', { exact: true }).first();
    await crumb.click();
    await conn.page.waitForTimeout(1000);
  }
  if(ctx.internalName&&!preserveView){const search=frame.locator(EXPERT_SEL.search).first();await search.fill(ctx.internalName);await conn.page.waitForTimeout(500);}
  return { ...conn, frame };
}

export async function cardByTitle(frame, title, internalName) {
  if(!title)throw Error('displayName required');
 if(internalName){await frame.locator(EXPERT_SEL.search).first().fill(internalName);await frame.locator('body').page().waitForTimeout(500);}
 return frame.locator(EXPERT_SEL.card).filter({has:frame.getByRole('heading',{name:title,exact:true})});
}
