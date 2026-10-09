import path from 'node:path';
import { withApp, dump, sleep, expertsFrame, fixtureRoot } from './lib.mjs';
await withApp(async (page) => {
  const f = await expertsFrame(page);
  // close any open dialog first
  for (let i = 0; i < 3; i++) { const has = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some(e => e.offsetWidth)); if (!has) break; await f.getByRole('button', { name: '取消', exact: true }).first().click({ timeout: 3000 }).catch(() => {}); await page.keyboard.press('Escape').catch(() => {}); await sleep(500); }
  await f.getByRole('button', { name: '导入专家', exact: true }).click({ timeout: 8000 });
  await sleep(1200);
  await f.locator('input[type="file"][webkitdirectory]').first().setInputFiles(path.join(fixtureRoot, 'expert-import'));
  await sleep(1200);
  const st = await f.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth);
    return { text: dlg ? dlg.innerText.replace(/\s+/g, ' ') : null, buttons: dlg ? [...dlg.querySelectorAll('button')].map(b => ({ t: norm(b.innerText), aria: b.getAttribute('aria-label'), disabled: b.disabled })) : [] };
  });
  dump('expert-import-after-select', st);
});
