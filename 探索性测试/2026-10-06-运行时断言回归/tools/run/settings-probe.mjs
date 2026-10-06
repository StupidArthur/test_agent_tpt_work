import { withApp, dump, sleep, visibleDialogText } from './lib.mjs';

await withApp(async (page) => {
  const settingsBtn = page.locator('button[aria-label="设置"]').first();
  const info = { count: await page.locator('button[aria-label="设置"]').count(), visible: await settingsBtn.isVisible().catch(() => false), shortcut: await settingsBtn.getAttribute('aria-keyshortcuts').catch(() => null) };
  await page.keyboard.press('Control+Comma');
  await sleep(1500);
  info.expandedAfterShortcut = await settingsBtn.getAttribute('aria-expanded').catch(() => null);
  const bodyText = await page.locator('body').innerText();
  const dialogs = await visibleDialogText(page);
  const controls = await page.locator('[role="switch"], [role="tab"], [role="radio"], [role="combobox"], button, input, select').evaluateAll(els => els.slice(0, 300).map(e => ({
    tag: e.tagName, role: e.getAttribute('role'),
    text: (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40),
    aria: e.getAttribute('aria-label'), checked: e.getAttribute('aria-checked'),
    value: e.tagName === 'INPUT' || e.tagName === 'SELECT' ? e.value : null,
    cls: (e.className || '').toString().slice(0, 60),
  })));
  await page.screenshot({ path: 'tools/run/scratch/settings-view.png', fullPage: false });
  dump('settings-open', { info, bodyText, dialogs, controls });
  // close
  await page.keyboard.press('Escape');
});
