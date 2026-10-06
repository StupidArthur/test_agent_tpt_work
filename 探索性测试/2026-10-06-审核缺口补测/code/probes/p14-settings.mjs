import fs from 'node:fs';
import { connect, findMainPage, sleep } from '../automation/connect.mjs';

const browser = await connect();
try {
  const page = findMainPage(browser);
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(400);
  await page.locator('[data-slot="settings.user"] button[aria-haspopup="menu"]').first().click({ timeout: 8000 });
  await sleep(700);
  await page.getByRole('menuitem', { name: '设置', exact: true }).click({ timeout: 8000 });
  await sleep(1500);
  const dlg = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    if (!d) return null;
    return { text: norm(d.innerText).slice(0, 2000), html: d.outerHTML.slice(0, 300) };
  });
  console.log('DIALOG', JSON.stringify(dlg, null, 2).slice(0, 2500));
  // nav buttons
  const nav = await page.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    return d ? [...d.querySelectorAll('button')].map((b) => ({ t: (b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 20), aria: b.getAttribute('aria-label') })).filter((b) => b.t || b.aria).slice(0, 60) : [];
  });
  console.log('NAV', JSON.stringify(nav));
} finally { await browser.close(); }
