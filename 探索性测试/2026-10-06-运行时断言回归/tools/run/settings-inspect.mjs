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
  await sleep(2000);
  const state = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    return {
      bodyText: document.body.innerText,
      switches: [...document.querySelectorAll('[role="switch"]')].map(e => ({ label: e.getAttribute('aria-label') || e.closest('label')?.innerText || '', checked: e.getAttribute('aria-checked'), cls: (e.className || '').toString().slice(0, 40) })),
      tabs: [...document.querySelectorAll('[role="tab"],[role="radio"]')].map(e => ({ text: norm(e.innerText), aria: e.getAttribute('aria-label'), selected: e.getAttribute('aria-selected') || e.getAttribute('aria-checked') })),
      selects: [...document.querySelectorAll('select, [role="combobox"]')].map(e => ({ tag: e.tagName, value: e.value ?? null, aria: e.getAttribute('aria-label'), text: norm(e.innerText).slice(0, 40) })),
      dialogs: [...document.querySelectorAll('[role="dialog"]')].map(e => ({ visible: !!(e.offsetWidth || e.offsetHeight), text: norm(e.innerText).slice(0, 400) })),
    };
  });
  await page.screenshot({ path: 'tools/run/scratch/settings-opened.png', fullPage: false });
  dump('settings-opened', state);
});
