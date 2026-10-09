import { withApp, dump, sleep } from './lib.mjs';

await withApp(async (page) => {
  // open an existing completed session to learn message DOM
  const row = page.locator('text=只回答：FAST_CHAT_OK').first();
  await row.click({ timeout: 8000 }).catch(() => {});
  await sleep(2500);
  const data = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const cand = [...document.querySelectorAll('[class*="body"],[class*="message"],[class*="Message"],[data-role],[data-msg-role]')].slice(-40).map(e => ({
      tag: e.tagName, cls: (e.className || '').toString().slice(0, 70), role: e.getAttribute('data-role') || e.getAttribute('data-message-role'),
      text: norm(e.innerText).slice(0, 80),
    }));
    return { cand, bodyTail: document.body.innerText.slice(-1200) };
  });
  dump('message-dom', data);
});
