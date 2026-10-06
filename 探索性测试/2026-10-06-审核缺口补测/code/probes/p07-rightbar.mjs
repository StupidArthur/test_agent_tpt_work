import fs from 'node:fs';
import { connect, findMainPage, sleep } from '../automation/connect.mjs';

const browser = await connect();
try {
  const page = findMainPage(browser);
  await page.getByRole('button', { name: '打开右侧边栏' }).first().click({ timeout: 8000 }).catch((e) => console.log('open err', e.message));
  await sleep(1200);
  const info = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const rb = document.querySelector('[data-slot="rightbar"]');
    const tabs = [...document.querySelectorAll('[data-slot="sidebar.right.pane.tab"]')].map((e) => ({ t: norm(e.innerText), slot: e.getAttribute('data-slot') }));
    const titles = [...document.querySelectorAll('[data-slot="sidebar.right.pane.tab.title"]')].map((e) => norm(e.innerText));
    return { visible: rb ? !!(rb.offsetWidth || rb.offsetHeight) : false, text: rb ? norm(rb.innerText).slice(0, 500) : null, tabs, titles, html: rb ? rb.outerHTML.slice(0, 1500) : null };
  });
  console.log(JSON.stringify(info, null, 2));
  fs.writeFileSync('code/probes/p07-rightbar.json', JSON.stringify(info, null, 2), 'utf8');
  await page.screenshot({ path: 'code/probes/p07-rightbar.png' });
} finally { await browser.close(); }
