import path from 'node:path';
import { withApp, dump, sleep, expertsFrame, fixtureRoot } from './lib.mjs';
await withApp(async (page) => {
  const f = await expertsFrame(page);
  for (let i = 0; i < 3; i++) { const has = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some(e => e.offsetWidth)); if (!has) break; await f.getByRole('button', { name: '取消', exact: true }).first().click({ timeout: 3000 }).catch(() => {}); await page.keyboard.press('Escape').catch(() => {}); await sleep(500); }
  await f.getByRole('button', { name: '导入专家', exact: true }).click({ timeout: 8000 });
  await sleep(1000);
  await f.locator('input[type="file"][webkitdirectory]').first().setInputFiles(path.join(fixtureRoot, 'expert-import'));
  await sleep(800);
  await f.getByRole('button', { name: '提交', exact: true }).click({ timeout: 8000 });
  await sleep(2500);
  const st = await f.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    return { dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(e => e.offsetWidth).map(d => norm(d.innerText).slice(0, 400)), buttons: [...document.querySelectorAll('[role="dialog"] button')].filter(e => e.offsetWidth).map(b => norm(b.innerText)) };
  });
  dump('expert-import-conflict', st);
});
