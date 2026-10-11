import { withApp, dump, sleep } from './lib.mjs';
await withApp(async (page) => {
  const key = await page.evaluate(() => { const r = [...document.querySelectorAll('[data-row-key^="session:"]')].find(e => /FAST_CHAT_OK/.test(e.innerText || '')); return r ? r.getAttribute('data-row-key') : null; });
  const row = page.locator(`[data-row-key="${key}"]`).first();
  await row.hover().catch(() => {});
  await page.locator(`[data-row-key="${key}"] button[aria-label*="的操作"]`).first().click({ timeout: 6000 });
  await sleep(800);
  const menu = await page.evaluate(() => { const out = []; document.querySelectorAll('*').forEach(e => { if (e.children.length === 0 && /标记为未读|标记为已读|置顶|归档/.test(e.textContent || '')) out.push((e.textContent || '').trim()); }); return [...new Set(out)]; });
  const mi = page.getByText('标记为未读', { exact: true });
  let clicked = false;
  if (await mi.count()) { await mi.first().click({ timeout: 5000 }); clicked = true; }
  await sleep(1200);
  const badge = await page.evaluate((k) => { const r = document.querySelector(`[data-row-key="${k}"]`); if (!r) return null; return [...r.querySelectorAll('*')].filter(e => e.children.length === 0 && /^\d+$/.test((e.textContent || '').trim())).map(e => e.textContent.trim()); }, key);
  const rowHtml = await page.evaluate((k) => { const r = document.querySelector(`[data-row-key="${k}"]`); return r ? r.outerHTML.slice(0, 1200) : null; }, key);
  dump('unread-probe', { key, menu, clicked, badge, rowHtml });
});
