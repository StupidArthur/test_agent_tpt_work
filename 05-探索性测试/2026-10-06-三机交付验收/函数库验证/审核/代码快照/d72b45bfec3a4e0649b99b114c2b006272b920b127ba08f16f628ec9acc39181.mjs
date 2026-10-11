// automation/skills.mjs — skills iframe operations (PC-88 smoke)
export const skillsFrame = (page) => page.frames().find(f => f.url().includes('supcon-skills'));
export const searchBox = (sf) => sf.locator('input[placeholder="搜索技能名称或描述"]');

export async function ensureMenu(page) {
  if (await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).count() === 0) {
    await page.getByRole('button', { name: '更多' }).click();
    await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).waitFor({ timeout: 5000 });
  }
}

export async function openSkills(page) {
  let f = skillsFrame(page);
  if (f) return f;
  await ensureMenu(page);
  await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).click();
  await page.waitForTimeout(2500);
  f = skillsFrame(page);
  if (!f) throw new Error('skills iframe not found');
  return f;
}

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
  const card = sf.locator('.card-main').first();
  await card.hover();
  const sw = sf.locator('.card-main [role=switch]').first();
  const cur = await sw.getAttribute('aria-checked');
  if ((cur === 'true') !== on) { await sw.click(); await page.waitForTimeout(1200); }
  return { before: cur, clicked: (cur === 'true') !== on };
}

export async function openAndReadDetail(page, sf, term) {
  await search(page, sf, term);
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
