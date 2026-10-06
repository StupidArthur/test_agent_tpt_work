import path from 'node:path';
import { withApp, dump, sleep, closeSettings, newTask, fixtureRoot } from './lib.mjs';
await withApp(async (page) => {
  await closeSettings(page);
  const clearAll = async () => { for (let i = 0; i < 40; i++) { const b = page.locator('[role="group"][aria-label="待发送附件"] button[aria-label^="移除文件"]').first(); if (!(await b.count())) break; await b.click({ timeout: 3000 }).catch(() => {}); await sleep(120); } };
  await newTask(page);
  await clearAll();
  const out = { afterClear: await page.locator('[role="group"][aria-label="待发送附件"] [class*="_item"]').count() };
  await page.locator('input[type="file"]').first().setInputFiles([path.join(fixtureRoot, 'attachments', 'preview.png')]);
  await sleep(1500);
  out.png = await page.evaluate(() => {
    const leaf = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && (e.textContent || '').trim() === 'preview.png');
    let card = leaf;
    for (let i = 0; i < 4 && card; i++) { if (/card/i.test(card.className || '')) break; card = card.parentElement; }
    const area = document.querySelector('[data-slot="conversation.input.attachments"]');
    return { cardHtml: card ? card.outerHTML.slice(0, 1200) : null, imgs: area ? [...area.querySelectorAll('img')].map(i => ({ complete: i.complete, nw: i.naturalWidth })) : [] };
  });
  // 30 exactly, look for hint
  await clearAll();
  const files = [];
  for (let i = 1; i <= 30; i++) files.push(path.join(fixtureRoot, 'attachments', 'count', `count-${String(i).padStart(2, '0')}.txt`));
  await page.locator('input[type="file"]').first().setInputFiles(files);
  await sleep(2000);
  out.thirty = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const area = document.querySelector('[data-slot="conversation.input.attachments"]');
    const rail = document.querySelector('[role="group"][aria-label="待发送附件"]');
    return {
      itemCount: rail ? rail.querySelectorAll('[class*="_item"]').length : 0,
      areaText: area ? norm(area.innerText).slice(0, 200) : null,
      hintMatches: norm(document.body.innerText).match(/\d+\s*\/\s*\d+/g),
      rail: rail ? { sw: rail.scrollWidth, cw: rail.clientWidth, sh: rail.scrollHeight, ch: rail.clientHeight } : null,
      railParent: rail && rail.parentElement ? { sw: rail.parentElement.scrollWidth, cw: rail.parentElement.clientWidth } : null,
    };
  });
  dump('attach5', out);
});
