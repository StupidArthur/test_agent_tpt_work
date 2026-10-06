import { withApp, dump, sleep, closeSettings, newTask, typeAndSend, waitTerminal, lastAssistantText } from './lib.mjs';
await withApp(async (page) => {
  await closeSettings(page);
  await newTask(page);
  const composerBefore = await page.locator('[contenteditable="true"]').first().innerText().catch(() => '');
  await typeAndSend(page, '只回答：ZZTEST_OK');
  const term = await waitTerminal(page, { expect: 'ZZTEST_OK', timeout: 90000 });
  const txt = await lastAssistantText(page);
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-row-key^="session:"]')].slice(0, 5).map(e => ({ k: e.getAttribute('data-row-key'), t: (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40) })));
  dump('newtask-send', { composerBefore, term, txt, rows });
});
