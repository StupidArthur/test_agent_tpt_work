import path from 'node:path';
import { withApp, dump, sleep, closeSettings, newTask, fixtureRoot } from './lib.mjs';
await withApp(async (page) => {
  await closeSettings(page);
  const clearAll = async () => { for (let r = 0; r < 4; r++) { const btns = page.locator('[role="group"][aria-label="待发送附件"] button[aria-label^="移除文件"], [role="group"][aria-label="待发送附件"] button[aria-label^="移除图片"]'); const n = await btns.count(); if (!n) break; for (let i = 0; i < n; i++) { await btns.first().click({ timeout: 3000 }).catch(() => {}); await sleep(100); } await sleep(400); } };
  await newTask(page); await clearAll();
  const files = []; for (let i = 1; i <= 30; i++) files.push(path.join(fixtureRoot, 'attachments', 'count', `count-${String(i).padStart(2, '0')}.txt`));
  await page.locator('input[type="file"]').first().setInputFiles(files);
  await sleep(2500);
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const body = norm(document.body.innerText);
    const idx = body.indexOf('待发送附件');
    const rail = document.querySelector('[role="group"][aria-label="待发送附件"]');
    const allText = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /\d\s*\/\s*\d/.test(e.textContent || '')).map(e => norm(e.textContent).slice(0, 30));
    return { aroundArea: body.slice(Math.max(0, idx - 50), idx + 200), slashTexts: allText.slice(0, 10), rail: rail ? { sh: rail.scrollHeight, ch: rail.clientHeight, sw: rail.scrollWidth, cw: rail.clientWidth } : null };
  });
  dump('g7hint', st);
});
