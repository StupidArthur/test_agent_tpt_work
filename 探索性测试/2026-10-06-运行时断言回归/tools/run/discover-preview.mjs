import path from 'node:path';
import { withApp, dump, sleep, closeSettings, newTask, fixtureRoot } from './lib.mjs';
await withApp(async (page) => {
  await closeSettings(page);
  const clearAll = async () => { for (let r = 0; r < 3; r++) { const btns = page.locator('[role="group"][aria-label="待发送附件"] button[aria-label^="移除文件"]'); const n = await btns.count(); if (!n) break; for (let i = 0; i < n; i++) { await btns.first().click({ timeout: 3000 }).catch(() => {}); await sleep(150); } await sleep(500); } };
  await newTask(page);
  await clearAll();
  const out = { remaining: await page.locator('[role="group"][aria-label="待发送附件"] [class*="_item"]').count() };
  await page.locator('input[type="file"]').first().setInputFiles([path.join(fixtureRoot, 'attachments', 'preview.png')]);
  await sleep(1200);
  // list all interactive elements in attachments area
  out.areaEls = await page.evaluate(() => {
    const area = document.querySelector('[data-slot="conversation.input.attachments"]');
    if (!area) return null;
    return [...area.querySelectorAll('*')].filter(e => e.getAttribute && (e.getAttribute('aria-label') || e.tagName === 'BUTTON' || e.tagName === 'IMG')).map(e => ({ tag: e.tagName, aria: e.getAttribute('aria-label'), cls: (e.className || '').toString().slice(0, 40) })).slice(0, 20);
  });
  // click thumbnail
  const img = page.locator('[data-slot="conversation.input.attachments"] img').first();
  await img.click({ timeout: 6000 }).catch(async () => { await page.locator('[data-slot="conversation.input.attachments"] [class*="card"]').first().click({ timeout: 6000 }); });
  await sleep(1500);
  out.preview = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const overlays = [...document.querySelectorAll('[role="dialog"],[class*="preview"],[class*="Preview"],[class*="lightbox"],[class*="Lightbox"]')].filter(e => e.offsetWidth).map(e => ({ cls: (e.className || '').toString().slice(0, 50), text: norm(e.innerText).slice(0, 60), imgs: [...e.querySelectorAll('img')].map(i => ({ complete: i.complete, nw: i.naturalWidth })) }));
    return overlays;
  });
  // try close (Escape)
  await page.keyboard.press('Escape'); await sleep(800);
  out.afterClose = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"],[class*="preview"],[class*="Preview"],[class*="lightbox"]')].filter(e => e.offsetWidth).length);
  dump('attach-preview', out);
});
