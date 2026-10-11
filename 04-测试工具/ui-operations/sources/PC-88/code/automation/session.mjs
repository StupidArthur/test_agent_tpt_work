// automation/session.mjs — CDP connection + surface discovery (PC-88 smoke run)
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));

export const CDP_PORT = Number(process.env.TPT_CDP_PORT ?? 9234);

export async function connect() {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  if (!page) { await browser.close(); throw new Error('TPT Work page not found'); }
  return { browser, page };
}

export const skillsFrame = (page) => page.frames().find(f => f.url().includes('supcon-skills'));
export const expertsFrame = (page) => page.frames().find(f => f.url().includes('supcon-agents'));

export async function closeDialogs(page, tries = 3) {
  for (let i = 0; i < tries; i++) {
    if (await page.locator('[role=dialog]:visible').count() === 0) break;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
}

export async function ensureMoreMenu(page) {
  if (await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).count() > 0) return;
  await page.getByRole('button', { name: '更多' }).click();
  await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).waitFor({ timeout: 5000 });
}

export async function goHome(page) {
  await closeDialogs(page);
  const nt = page.getByRole('button', { name: '新建任务' });
  if (await nt.count()) { await nt.first().click(); await page.waitForTimeout(1000); }
}

export async function openSkills(page) {
  let f = skillsFrame(page);
  if (f) return f;
  await ensureMoreMenu(page);
  await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).click();
  await page.waitForTimeout(2500);
  f = skillsFrame(page);
  if (!f) throw new Error('skills iframe not found');
  return f;
}

export async function openExperts(page) {
  let f = expertsFrame(page);
  if (f) return f;
  await ensureMoreMenu(page);
  await page.locator('button.tpt-sidebar-action', { hasText: '专家' }).click();
  await page.waitForTimeout(2500);
  f = expertsFrame(page);
  if (!f) throw new Error('experts iframe not found');
  return f;
}

export async function closeSidebarPanels(page) {
  // If a sidebar iframe panel is open, clicking its action again closes it.
  await closeDialogs(page);
  for (const name of ['技能', '专家']) {
    const btn = page.locator('button.tpt-sidebar-action', { hasText: name });
    if (await btn.count()) { await btn.click(); await page.waitForTimeout(600); }
  }
}
