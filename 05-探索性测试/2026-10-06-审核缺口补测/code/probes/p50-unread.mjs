import fs from 'node:fs';
import { withApp, sleep } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  const key = await page.evaluate(() => { const r = [...document.querySelectorAll('[data-row-key^="session:"]')].find((e) => /FAST_CHAT_OK/.test(e.innerText || '')); return r ? r.getAttribute('data-row-key') : null; });
  console.log('key', key);
  if (!key) return;
  const row = page.locator(`[data-row-key="${key}"]`).first();
  await row.hover().catch(() => {});
  const op = page.locator(`[data-row-key="${key}"] button[aria-label*="的操作"]`).first();
  console.log('op count', await op.count());
  await op.click({ timeout: 6000 }).catch((e) => console.log('op err', e.message));
  await sleep(800);
  const items = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"],button')].map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter((t) => /未读|已读|标记/.test(t)));
  console.log('menu items', JSON.stringify(items));
  const mi = page.getByText('标记为未读', { exact: true });
  if (await mi.count()) await mi.first().click({ timeout: 5000 }).catch(() => {});
  await sleep(1500);
  const rowInfo = await page.evaluate((k) => {
    const r = document.querySelector(`[data-row-key="${k}"]`);
    if (!r) return null;
    const leaves = [...r.querySelectorAll('*')].filter((e) => e.children.length === 0 && (e.textContent || '').trim());
    return { html: r.outerHTML.slice(0, 2000), leaves: leaves.map((e) => ({ t: (e.textContent || '').trim().slice(0, 20), cls: (e.className || '').toString().slice(0, 50), aria: e.getAttribute('aria-label') })) };
  }, key);
  console.log(JSON.stringify(rowInfo, null, 2).slice(0, 2500));
  fs.writeFileSync('code/probes/p50-unread.json', JSON.stringify(rowInfo, null, 2), 'utf8');
});
