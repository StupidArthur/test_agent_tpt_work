import { withApp, dump, sleep, runningCount } from './lib.mjs';
await withApp(async (page) => {
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    return {
      tabs: [...document.querySelectorAll('[role="tab"]')].map(t => ({ text: norm(t.innerText), selected: t.getAttribute('aria-selected') })),
      composer: norm(document.querySelector('[contenteditable="true"]')?.innerText || ''),
      assistantBodies: [...document.querySelectorAll('[class*="hWmORq_body"]')].map(e => norm(e.innerText).slice(0, 80)),
      userBodies: [...document.querySelectorAll('[class*="wSkVaW_body"]')].map(e => norm(e.innerText).slice(0, 60)),
      lastAssistantAny: norm([...document.querySelectorAll('[class*="_body"]')].map(e => e.innerText).filter(Boolean).at(-1) || '').slice(0, 200),
      bodyTail: norm(document.body.innerText).slice(-500),
    };
  });
  st.running = await runningCount(page);
  dump('g3-state', st);
});
