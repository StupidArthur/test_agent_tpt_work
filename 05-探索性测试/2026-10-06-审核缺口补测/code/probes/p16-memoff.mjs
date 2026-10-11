import fs from 'node:fs';
import { connect, findMainPage, sleep } from '../automation/connect.mjs';

const browser = await connect();
try {
  const page = findMainPage(browser);
  await sleep(300);
  const state1 = await page.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    const cbs = [...d.querySelectorAll('input[type="checkbox"]')];
    return cbs.map((c) => ({ checked: c.checked, label: (c.closest('label')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30) }));
  });
  console.log('before', JSON.stringify(state1));
  // toggle first (启用记忆) off
  const memLabel = page.locator('[role="dialog"]:visible label').filter({ hasText: '启用记忆' }).first();
  console.log('label count', await memLabel.count());
  await memLabel.click({ timeout: 8000 }).catch((e) => console.log('click err', e.message));
  await sleep(1500);
  const state2 = await page.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    const cbs = [...d.querySelectorAll('input[type="checkbox"]')];
    return cbs.map((c) => ({ checked: c.checked, label: (c.closest('label')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30) }));
  });
  console.log('after toggle', JSON.stringify(state2));
} finally { await browser.close(); }
