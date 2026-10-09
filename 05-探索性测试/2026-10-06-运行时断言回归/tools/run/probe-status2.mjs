import { withApp, dump, sleep } from './lib.mjs';
await withApp(async (page) => {
  const A = 'session:session-0a273d0c-05fe-4e03-bbf7-efc9f6aed912';
  const B = 'session:session-cc139da5-4a02-44d8-aff7-6477262c2ef5';
  const read = () => page.evaluate((k) => { const r = document.querySelector(`[data-row-key="${k}"]`); if (!r) return null; const dot = r.querySelector('[class*="dot"]'); const vh = r.querySelector('[class*="visuallyHidden"]'); return { dotState: dot ? dot.getAttribute('data-state') : null, dotStyle: dot ? getComputedStyle(dot).backgroundColor : null, vh: vh ? vh.textContent.trim() : null }; }, A);
  // switch to B
  await page.locator(`[data-row-key="${B}"]`).first().click({ timeout: 6000 }).catch(() => {});
  await sleep(1500);
  const before = await read();
  // mark A unread
  const row = page.locator(`[data-row-key="${A}"]`).first();
  await row.hover().catch(() => {});
  await page.locator(`[data-row-key="${A}"] button[aria-label*="的操作"]`).first().click({ timeout: 6000 }).catch(() => {});
  await sleep(700);
  const items = await page.evaluate(() => { const out = []; document.querySelectorAll('*').forEach(e => { if (e.children.length === 0 && /标记为未读|标记为已读/.test(e.textContent || '')) out.push(e.textContent.trim()); }); return [...new Set(out)]; });
  const mi = page.getByText('标记为未读', { exact: true }).last();
  await mi.click({ timeout: 5000 }).catch(() => {});
  await sleep(1500);
  const after = await read();
  dump('status-probe2', { before, items, after });
});
