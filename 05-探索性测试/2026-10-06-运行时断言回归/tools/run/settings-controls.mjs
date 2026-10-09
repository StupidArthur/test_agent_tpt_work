import { withApp, dump, sleep } from './lib.mjs';

await withApp(async (page) => {
  const openMenu = async () => {
    if (!(await page.locator('[role="menu"]:visible').count())) {
      await page.locator('[data-slot="settings.user"] button[aria-haspopup="menu"]').first().click();
      await sleep(600);
    }
  };
  await openMenu();
  await page.getByRole('menuitem', { name: '设置', exact: true }).click();
  await sleep(1500);

  const nav = await page.locator('[role="dialog"]:visible [role="tab"], [role="dialog"]:visible [role="menuitem"], [role="dialog"]:visible button').evaluateAll(els => els.map(e => ({
    text: (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 30),
    aria: e.getAttribute('aria-label'), role: e.getAttribute('role'),
    selected: e.getAttribute('aria-selected') || e.getAttribute('aria-checked') || e.getAttribute('aria-pressed'),
    dataState: e.getAttribute('data-state'),
    cls: (e.className || '').toString().slice(0, 40),
  })));
  dump('settings-controls', nav);
});
