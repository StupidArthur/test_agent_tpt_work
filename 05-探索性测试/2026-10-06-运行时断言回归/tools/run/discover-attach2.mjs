import path from 'node:path';
import { withApp, dump, sleep, closeSettings, newTask, fixtureRoot } from './lib.mjs';
await withApp(async (page) => {
  await closeSettings(page);
  await newTask(page);
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles([
    path.join(fixtureRoot, 'attachments', 'attachment-a.txt'),
    path.join(fixtureRoot, 'attachments', 'attachment-b.txt'),
    path.join(fixtureRoot, 'attachments', 'attachment-c.md'),
  ]);
  await sleep(1500);
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const composer = document.querySelector('[contenteditable="true"]')?.closest('form, [class*="composer"], [class*="uV2eYG"]') || document.body;
    const cards = [...document.querySelectorAll('[class*="attach"],[class*="Attach"],[class*="fileCard"],[class*="FileCard"],[class*="chip"]')].filter(e => e.offsetWidth).map(e => ({ cls: (e.className || '').toString().slice(0, 60), text: norm(e.innerText).slice(0, 60), title: e.getAttribute('title') }));
    return {
      bodyHasNames: ['attachment-a.txt', 'attachment-b.txt', 'attachment-c.md'].map(n => document.body.innerText.includes(n)),
      cards,
      composerHtml: composer ? composer.outerHTML.slice(0, 3000) : null,
    };
  });
  dump('attach-after-add', st);
});
