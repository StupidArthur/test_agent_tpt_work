// 软件操作支撑层：技能页 iframe 定位与交互原语。
import { connect } from './session.mjs';
import {openSidebarAction} from './navigation.mjs';

export const SKILL_SEL = {
  navItem: 'button[aria-label="技能"]',
  frameUrlPart: 'supcon-skills',
  importBtn: '导入技能',
  search: 'input[aria-label="搜索技能"]',
  dialog: '[role="dialog"]',
  fileInput: 'input[type="file"][accept*=".md"]',
  dirInput: 'input[type="file"][webkitdirectory]',
  card: 'section.panel [data-slot="card"]',
  cardTitle: '.card-title h3',
  cardSwitch: '[role="switch"]',
};

export async function connectSkills(ctx, { preserveView = false } = {}) {
  const conn = await connect(ctx);
  let frame = conn.page.frames().find((f) => f.url().includes(SKILL_SEL.frameUrlPart));
  if (!frame) {
    await openSidebarAction(conn.page,'技能');
    await conn.page.waitForTimeout(1500);
    frame = conn.page.frames().find((f) => f.url().includes(SKILL_SEL.frameUrlPart));
  }
  if (!frame) { await conn.close(); throw new Error('未找到技能 iframe'); }
  // 若处于详情整页，先返回列表，保证卡片定位器可用。
  if (!preserveView && await frame.locator('[class*="dir-preview"]').count()) {
    const crumb = frame.locator('[class*="page-top"]').getByText('技能', { exact: true }).first();
    await crumb.click();
    await conn.page.waitForTimeout(1000);
  }
  if(ctx.internalName&&!preserveView){const search=frame.locator(SKILL_SEL.search).first();await search.fill(ctx.internalName);await conn.page.waitForTimeout(500);}
  return { ...conn, frame };
}

export async function cardByTitle(frame, title, internalName) {
  if(!title)throw Error('displayName required');
 if(internalName){await frame.locator(SKILL_SEL.search).first().fill(internalName);await frame.locator('body').page().waitForTimeout(500);}
 return frame.locator(SKILL_SEL.card).filter({has:frame.getByRole('heading',{name:title,exact:true})});
}
