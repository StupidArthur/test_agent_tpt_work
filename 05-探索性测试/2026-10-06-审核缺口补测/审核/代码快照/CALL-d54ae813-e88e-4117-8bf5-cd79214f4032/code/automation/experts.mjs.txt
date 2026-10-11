// Experts iframe helpers (runtime support).
import fs from 'node:fs';
import path from 'node:path';
import { sleep, expertsFrame } from './tpt.mjs';

export const AGENTS_DIR = 'C:\\Users\\Administrator\\.tpt-work\\agents';

export function agentDirNames() {
  return fs.readdirSync(AGENTS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
}
export function registryEntryCount() {
  const p = path.join(AGENTS_DIR, '.registry.json');
  return JSON.parse(fs.readFileSync(p, 'utf8')).entries ? Object.keys(JSON.parse(fs.readFileSync(p, 'utf8')).entries).length : 0;
}

export async function openExperts(page) {
  const frame = await expertsFrame(page);
  if (!frame) throw new Error('experts frame not found');
  return frame;
}

export async function expBackToList(frame) {
  for (let i = 0; i < 4; i++) {
    const isDetail = await frame.evaluate(() => /专家详情/.test(document.body.innerText));
    if (!isDetail) return;
    await frame.getByRole('button', { name: '专家', exact: true }).first().click({ timeout: 5000 }).catch(() => {});
    await sleep(900);
  }
}

export async function expCloseDialogs(frame, page) {
  for (let i = 0; i < 4; i++) {
    const has = await frame.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some((e) => e.offsetWidth));
    if (!has) break;
    const x = frame.locator('[role="dialog"] button[aria-label="关闭"]').first();
    if (await x.count()) await x.click({ timeout: 3000 }).catch(() => {});
    else await frame.getByRole('button', { name: '取消', exact: true }).first().click({ timeout: 3000 }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(500);
  }
}

export async function expEnsureList(page) {
  const frame = await openExperts(page);
  await expCloseDialogs(frame, page);
  await expBackToList(frame);
  return frame;
}

export async function expertCardCount(frame) {
  return frame.evaluate(() => document.querySelectorAll('[class*="_card_"]').length);
}

export async function expertDialogInfo(frame) {
  return frame.evaluate(() => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    return {
      present: !!dlg,
      text: dlg ? dlg.innerText.replace(/\s+/g, ' ').trim() : '',
      dirInputs: dlg ? dlg.querySelectorAll('input[webkitdirectory]').length : 0,
    };
  });
}

// Returns { submitted, dialogText, dialogOpen }. Never throws on app-side rejection.
export async function importExpertDir(frame, dir, { uiWaitMs = 5000, overwrite = false } = {}) {
  await frame.getByRole('button', { name: '导入专家', exact: true }).click({ timeout: 8000 });
  await sleep(1000);
  const input = frame.locator('[role="dialog"] input[type="file"][webkitdirectory]').first();
  await input.setInputFiles(dir);
  await sleep(1000);
  const submit = frame.locator('[role="dialog"]').getByRole('button', { name: /^(提交|导入|确认导入)$/ }).first();
  let submitted = false;
  if (await submit.count()) {
    if (!(await submit.isDisabled().catch(() => true))) {
      await submit.click({ timeout: 8000 });
      submitted = true;
      await sleep(uiWaitMs);
    }
  }
  if (overwrite) {
    const conflict = frame.locator('[role="dialog"]').getByRole('button', { name: '覆盖现有', exact: true }).first();
    if (await conflict.count()) {
      await conflict.click({ timeout: 5000 }).catch(() => {});
      await sleep(2500);
    }
  }
  const info = await expertDialogInfo(frame);
  return { submitted, dialogOpen: info.present, dialogText: info.text };
}
