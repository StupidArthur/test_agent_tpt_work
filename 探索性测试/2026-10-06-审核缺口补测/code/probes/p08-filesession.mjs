import fs from 'node:fs';
import { connect, findMainPage, sleep } from '../automation/connect.mjs';

const browser = await connect();
try {
  const page = findMainPage(browser);
  await page.keyboard.press('Escape').catch(() => {});
  // open a session whose title mentions creating a file
  const row = page.locator('[data-slot="sidebar.workspaces.session.row.action"]').filter({ hasText: '创建' }).first();
  console.log('rows with 创建:', await page.locator('[data-slot="sidebar.workspaces.session.row.action"]').filter({ hasText: '创建' }).count());
  const alt = page.locator('[data-slot="sidebar.workspaces.session.row.action"]').filter({ hasText: 'DIALOG047' }).first();
  const target = (await alt.count()) ? alt : row;
  console.log('target count', await target.count());
  if (await target.count()) { await target.click({ timeout: 8000 }).catch((e) => console.log('click err', e.message)); await sleep(2500); }
  const info = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const chat = document.querySelector('[data-conversation-region="chat"]');
    const session = document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session');
    const cand = chat ? [...chat.querySelectorAll('*')].filter((e) => /file|artifact|deliver|attachment|card/i.test((e.className || '').toString()) && (e.offsetWidth || e.offsetHeight)) : [];
    const uniq = [...new Set(cand.map((e) => (e.className || '').toString().split(' ').filter((c) => /file|artifact|deliver|attach|card/i.test(c))[0]))].slice(0, 40);
    const slots = chat ? [...new Set([...chat.querySelectorAll('[data-slot]')].map((e) => e.getAttribute('data-slot')))] : [];
    return { session, classes: uniq, slots, chatText: chat ? norm(chat.innerText).slice(0, 500) : null };
  });
  console.log(JSON.stringify(info, null, 2));
  fs.writeFileSync('code/probes/p08-filesession.json', JSON.stringify(info, null, 2), 'utf8');
} finally { await browser.close(); }
