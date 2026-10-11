import { withApp, dump, sleep } from './lib.mjs';
await withApp(async (page) => {
  const key = 'session:session-0a273d0c-05fe-4e03-bbf7-efc9f6aed912';
  const read = () => page.evaluate((k) => { const r = document.querySelector(`[data-row-key="${k}"]`); if (!r) return null; const st = r.querySelector('[data-tpt-region-row-status]'); const dot = r.querySelector('._dot_2uv45_3, [class*="dot"]'); const vh = r.querySelector('[class*="visuallyHidden"]'); return { statusAttr: st ? st.getAttribute('data-tpt-region-row-status') : null, dotState: dot ? dot.getAttribute('data-state') : null, dotVisible: dot ? !!(dot.offsetWidth || dot.offsetHeight) : false, vh: vh ? vh.textContent.trim() : null }; }, key);
  const before = await read();
  // mark unread
  const row = page.locator(`[data-row-key="${key}"]`).first();
  await row.hover().catch(() => {});
  await page.locator(`[data-row-key="${key}"] button[aria-label*="的操作"]`).first().click({ timeout: 6000 }).catch(() => {});
  await sleep(700);
  const mi = page.getByText('标记为未读', { exact: true }).last();
  await mi.click({ timeout: 5000 }).catch(() => {});
  await sleep(1500);
  const after = await read();
  dump('status-probe', { before, after });
});
