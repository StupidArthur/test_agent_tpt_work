import { withApp, dump, sleep } from './lib.mjs';

await withApp(async (page) => {
  const labels = await page.locator('button, [role="button"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [aria-haspopup], a[href]').evaluateAll(els => {
    const set = new Set();
    for (const e of els) {
      const s = (e.getAttribute('aria-label') || e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50);
      if (s) set.add(s);
    }
    return [...set];
  });
  dump('labels', labels);
});
