import { withApp, dump, sleep } from './lib.mjs';

await withApp(async (page) => {
  const html = await page.evaluate(() => document.querySelector('.hHd-Xa_footArea')?.outerHTML || null);
  dump('footarea-html', { html: html ? html.slice(0, 4000) : null });
  // move real mouse over the foot area center
  const box = await page.locator('.hHd-Xa_footArea').boundingBox();
  if (box) { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); }
  await sleep(500);
  const disp = await page.evaluate(() => {
    const b = document.querySelector('button[aria-label="设置"]');
    return { display: getComputedStyle(b).display };
  });
  dump('footarea-hover-state', disp);
});
