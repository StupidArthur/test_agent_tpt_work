import fs from 'node:fs';
import { connect, findMainPage, sleep } from '../automation/connect.mjs';

const browser = await connect();
try {
  const page = findMainPage(browser);
  for (let i = 0; i < 60; i++) {
    const t = await page.evaluate(() => {
      const chat = document.querySelector('[data-conversation-region="chat"]');
      return { session: document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session'), text: chat ? chat.innerText.replace(/\s+/g, ' ').trim().slice(-400) : null };
    });
    console.log(i, t.session, JSON.stringify(t.text));
    if (/G1PROBE_OK/.test(t.text) && !/探索中/.test(t.text)) break;
    await sleep(5000);
  }
} finally { await browser.close(); }
