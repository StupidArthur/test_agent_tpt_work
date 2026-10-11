import fs from 'node:fs';
import { connect, findMainPage, sleep } from '../automation/connect.mjs';

const browser = await connect();
try {
  const page = findMainPage(browser);
  const info = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const header = document.querySelector('[data-slot="conversation.session.header"]');
    const rightbar = document.querySelector('[data-slot="rightbar"]');
    const chat = document.querySelector('[data-conversation-region="chat"]');
    const hits = [];
    document.querySelectorAll('*').forEach((e) => {
      if (e.children.length) return;
      const t = norm(e.textContent);
      if (/产物|交付|生成文件|附件/.test(t) && t.length < 30) hits.push({ t, cls: (e.className || '').toString().slice(0, 60), slot: e.closest('[data-slot]')?.getAttribute('data-slot') });
    });
    return {
      headerText: header ? norm(header.innerText).slice(0, 300) : null,
      headerBtns: header ? [...header.querySelectorAll('button')].map((b) => ({ aria: b.getAttribute('aria-label'), t: norm(b.innerText), slot: b.getAttribute('data-slot') })) : [],
      rightbarText: rightbar ? norm(rightbar.innerText).slice(0, 300) : null,
      rightbarExists: !!rightbar, rightbarVisible: rightbar ? !!(rightbar.offsetWidth || rightbar.offsetHeight) : false,
      chatExists: !!chat,
      chatChildSlots: chat ? [...new Set([...chat.querySelectorAll('[data-slot]')].map((e) => e.getAttribute('data-slot')))].slice(0, 40) : [],
      hits: hits.slice(0, 40),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  fs.writeFileSync('code/probes/p06-header.json', JSON.stringify(info, null, 2), 'utf8');
} finally { await browser.close(); }
