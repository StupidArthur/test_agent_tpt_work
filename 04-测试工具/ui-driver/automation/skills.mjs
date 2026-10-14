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

// Independent skill operations; navigation shares the main implementation.
import {parseBoolean} from './identity.mjs';
import {skillsFrame,ensureMoreMenu as ensureMenu,openSkills} from './navigation.mjs';
export {skillsFrame,ensureMenu,openSkills};
export const searchBox = (sf) => sf.locator('input[placeholder="搜索技能名称或描述"]');

export async function closeSkills(page) {
  if (!skillsFrame(page)) return;
  await ensureMenu(page);
  await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).click();
  await page.waitForTimeout(1500);
}

export async function importSkill(page, sf, filePath) {
  await sf.getByRole('button', { name: '导入技能' }).click();
  await page.waitForTimeout(700);
  await sf.locator('input[type=file][accept=".zip,.md"]').setInputFiles(filePath);
  await page.waitForTimeout(700);
  await sf.getByRole('button', { name: '导入' }).click();
  await page.waitForTimeout(2000);
  const body = await sf.locator('body').innerText();
  const m = body.match(/导入完成：\S+/);
  return { feedback: m ? m[0] : null, dialogStillOpen: await sf.locator('[role=dialog]:visible').count() };
}

export async function search(page, sf, term) {
  await searchBox(sf).fill(term);
  await page.waitForTimeout(1200);
  return await sf.locator('body').innerText();
}

export async function listCards(sf) {
  return await sf.locator('.card-main').evaluateAll(els => els.map(e => {
    const title = e.querySelector('.card-title')?.innerText?.trim() ?? null;
    const foot = e.querySelector('.card-foot')?.innerText?.replace(/\n+/g, ' | ').trim() ?? null;
    const sw = e.querySelector('[role=switch]');
    return { title, foot, switchAria: sw ? sw.getAttribute('aria-checked') : null, switchState: sw ? sw.getAttribute('data-state') : null };
  }));
}

export async function readSwitch(page, sf, term) {
  await search(page, sf, term);
  if(await sf.locator('.card-main').count()!==1)throw Error('Search must resolve one skill card');
  const sw = sf.locator('.card-main [role=switch]').first();
  if (await sw.count() === 0) return { present: false };
  return { present: true, ariaChecked: await sw.getAttribute('aria-checked'), dataState: await sw.getAttribute('data-state') };
}

export async function setSwitch(page, sf, term, on) {
  await search(page, sf, term);
  if(await sf.locator('.card-main').count()!==1)throw Error('Search must resolve one skill card');
  const card = sf.locator('.card-main').first();
  await card.hover();
  const sw = sf.locator('.card-main [role=switch]').first();
  const cur = await sw.getAttribute('aria-checked');
  if (parseBoolean(cur) !== on) { await sw.click(); await page.waitForTimeout(1200); }
  return { before: cur, clicked: (cur === 'true') !== on };
}

export async function openAndReadDetail(page, sf, term) {
  await search(page, sf, term);
  if(await sf.locator('.card-main').count()!==1)throw Error('Search must resolve one skill card');
  await sf.locator('.card-main').first().hover();
  await sf.locator('.card-main').first().click({ timeout: 8000 });
  await page.waitForTimeout(1500);
  const body = await sf.locator('body').innerText();
  const preview=sf.locator('[class*="dir-preview"]').first();await preview.waitFor({state:'visible'});
  const content=await preview.innerText();
  const nameMatch = content.match(/(?:^|\r?\n)name:\s*([^\r\n]+)/);
  const versionMatch = body.match(/\n([0-9]+\.[0-9]+\.[0-9]+)/);
  const sourceMatch = body.match(/来源\s*\n?\s*([^\n]+)/);
  return {
    detailOpen: /详情/.test(body) && /版本/.test(body),
    name: nameMatch ? nameMatch[1].trim().replace(/^['"]|['"]$/g,'') : null,
    version: versionMatch ? versionMatch[1].trim() : null,
    source: sourceMatch ? sourceMatch[1].trim() : null,
    rawTail: body.slice(0, 1200),
  };
}
