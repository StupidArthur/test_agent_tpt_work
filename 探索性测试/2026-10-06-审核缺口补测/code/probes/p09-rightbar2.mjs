import fs from 'node:fs';
import { connect, findMainPage, sleep } from '../automation/connect.mjs';

const browser = await connect();
try {
  const page = findMainPage(browser);
  await page.keyboard.press('Escape').catch(() => {});
  await page.getByRole('button', { name: '打开右侧边栏' }).first().click({ timeout: 8000 }).catch(() => {});
  await sleep(1000);
  // dump all visible tab titles and buttons in rightbar
  const dump1 = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const rb = document.querySelector('[data-slot="rightbar"]');
    const tabs = [...document.querySelectorAll('[data-dockkit-tab]')].map((e) => ({ t: norm(e.innerText).slice(0, 40), sel: e.getAttribute('aria-selected'), title: e.querySelector('[data-dockkit-tab-title]') ? norm(e.querySelector('[data-dockkit-tab-title]').innerText) : null }));
    const btns = rb ? [...rb.querySelectorAll('button')].map((b) => ({ aria: b.getAttribute('aria-label'), t: norm(b.innerText).slice(0, 30) })).filter((b) => b.aria || b.t) : [];
    return { tabs, btns: btns.slice(0, 40) };
  });
  console.log('DOCK TABS', JSON.stringify(dump1, null, 2));
  // click 工作区文件 entry
  const wf = page.getByText('工作区文件', { exact: true }).first();
  console.log('工作区文件 count', await wf.count());
  if (await wf.count()) { await wf.click({ timeout: 5000 }).catch((e) => console.log('wf click err', e.message)); await sleep(1500); }
  const dump2 = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const rb = document.querySelector('[data-slot="rightbar"]');
    const visible = rb ? [...rb.querySelectorAll('*')].filter((e) => (e.offsetWidth || e.offsetHeight)) : [];
    return { text: rb ? norm(rb.innerText).slice(0, 600) : null };
  });
  console.log('AFTER', JSON.stringify(dump2, null, 2));
  await page.screenshot({ path: 'code/probes/p09-rightbar2.png' });
} finally { await browser.close(); }
