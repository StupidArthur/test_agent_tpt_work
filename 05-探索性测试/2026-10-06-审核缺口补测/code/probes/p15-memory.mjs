import fs from 'node:fs';
import { connect, findMainPage, sleep } from '../automation/connect.mjs';

const browser = await connect();
try {
  const page = findMainPage(browser);
  await sleep(300);
  // settings already open; click 记忆与进化
  const nav = page.locator('[role="dialog"]:visible button').filter({ hasText: /^记忆与进化/ }).first();
  console.log('nav count', await nav.count());
  await nav.click({ timeout: 8000 }).catch((e) => console.log('nav err', e.message));
  await sleep(1500);
  const info = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    if (!d) return null;
    const switches = [...d.querySelectorAll('input[type="checkbox"], [role="switch"], button[aria-checked]')].map((e) => ({ type: e.getAttribute('type'), role: e.getAttribute('role'), checked: e.getAttribute('aria-checked') ?? e.checked, aria: e.getAttribute('aria-label'), text: norm(e.closest('label')?.innerText || e.parentElement?.innerText).slice(0, 60) }));
    return { text: norm(d.innerText).slice(0, 1500), switches };
  });
  console.log(JSON.stringify(info, null, 2));
  fs.writeFileSync('code/probes/p15-memory.json', JSON.stringify(info, null, 2), 'utf8');
} finally { await browser.close(); }
