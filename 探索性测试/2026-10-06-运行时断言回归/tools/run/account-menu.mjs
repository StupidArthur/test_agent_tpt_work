import { withApp, dump, sleep } from './lib.mjs';

await withApp(async (page) => {
  const acct = page.locator('[data-slot="settings.user"] button[aria-haspopup="menu"]').first();
  await acct.click({ timeout: 8000 });
  await sleep(800);
  const menu = await page.evaluate(() => [...document.querySelectorAll('[role="menu"],[role="menuitem"],[data-slot*="menu"]')].map(e => ({ role: e.getAttribute('role'), visible: !!(e.offsetWidth || e.offsetHeight), text: (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 200) })));
  await page.screenshot({ path: 'tools/run/scratch/account-menu.png' });
  dump('account-menu', { menu });
});
