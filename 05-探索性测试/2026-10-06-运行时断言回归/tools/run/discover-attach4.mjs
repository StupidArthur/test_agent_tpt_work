import path from 'node:path';
import { withApp, dump, sleep, closeSettings, newTask, fixtureRoot } from './lib.mjs';
await withApp(async (page) => {
  await closeSettings(page);
  const out = {};
  // 30 files
  await newTask(page);
  const files = [];
  for (let i = 1; i <= 30; i++) files.push(path.join(fixtureRoot, 'attachments', 'count', `count-${String(i).padStart(2, '0')}.txt`));
  await page.locator('input[type="file"]').first().setInputFiles(files);
  await sleep(2000);
  out.thirty = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const rail = document.querySelector('[role="group"][aria-label="待发送附件"]');
    const items = rail ? rail.querySelectorAll('[class*="_item"]') : [];
    const area = document.querySelector('[data-slot="conversation.input.attachments"]');
    const btns = area ? [...area.querySelectorAll('button')].map(b => ({ aria: b.getAttribute('aria-label'), t: norm(b.innerText).slice(0, 20), cls: (b.className || '').toString().slice(0, 30) })) : [];
    const hint = norm(document.body.innerText).match(/\d+\s*\/\s*30/g);
    return { itemCount: items.length, buttons: btns.slice(0, 6), hint, railScroll: rail ? { sh: rail.scrollHeight, ch: rail.clientHeight } : null, parentScroll: rail && rail.parentElement ? { sh: rail.parentElement.scrollHeight, ch: rail.parentElement.clientHeight } : null };
  });
  // preview.png
  await newTask(page);
  await page.locator('input[type="file"]').first().setInputFiles([path.join(fixtureRoot, 'attachments', 'preview.png')]);
  await sleep(1500);
  out.png = await page.evaluate(() => {
    const card = document.querySelector('[class*="card"][title="preview.png"]') || document.querySelector('[title="preview.png"]');
    return { cardHtml: card ? card.outerHTML.slice(0, 900) : null };
  });
  dump('attach-more', out);
});
