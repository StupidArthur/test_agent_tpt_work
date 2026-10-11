import { withApp, dump, sleep } from './lib.mjs';

await withApp(async (page) => {
  const bodyText = await page.locator('body').innerText();
  const buttons = await page.locator('button, [role="button"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [aria-haspopup]').evaluateAll(els => els.map(e => ({
    tag: e.tagName, role: e.getAttribute('role'),
    text: (e.innerText || '').trim().slice(0, 60),
    aria: e.getAttribute('aria-label'), expanded: e.getAttribute('aria-expanded'),
    checked: e.getAttribute('aria-checked'), cls: (e.className || '').toString().slice(0, 80),
  })));
  dump('main-buttons', { bodyText, buttons });
});
