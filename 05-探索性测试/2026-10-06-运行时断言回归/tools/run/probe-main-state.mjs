import { withApp, dump } from './lib.mjs';
await withApp(async (page) => {
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    return {
      tabs: [...document.querySelectorAll('[role="tab"]')].map(t => ({ text: norm(t.innerText), selected: t.getAttribute('aria-selected') })),
      bodyTail: norm(document.body.innerText).slice(-600),
      composer: norm(document.querySelector('[contenteditable="true"]')?.innerText || ''),
    };
  });
  dump('main-state', st);
});
