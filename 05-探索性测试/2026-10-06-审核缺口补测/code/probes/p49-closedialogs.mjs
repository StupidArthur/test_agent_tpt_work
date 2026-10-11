import fs from 'node:fs';
import { withApp, sleep, expandMore } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  const before = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.offsetWidth).map((e) => (e.innerText || '').replace(/\s+/g, ' ').slice(0, 120)));
  console.log('main dialogs before', JSON.stringify(before));
  for (let i = 0; i < 6; i++) {
    const has = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some((e) => e.offsetWidth));
    if (!has) break;
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(500);
    const close = page.locator('[role="dialog"]:visible button').filter({ hasText: /^(关闭|取消|Close)$/ }).first();
    if (await close.count()) await close.click({ timeout: 3000, force: true }).catch(() => {});
    await sleep(500);
  }
  const after = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.offsetWidth).map((e) => (e.innerText || '').replace(/\s+/g, ' ').slice(0, 120)));
  console.log('main dialogs after', JSON.stringify(after));
  // frames
  for (const f of page.frames()) {
    if (!/supcon-/.test(f.url())) continue;
    const dl = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.offsetWidth).map((e) => (e.innerText || '').replace(/\s+/g, ' ').slice(0, 120))).catch(() => []);
    console.log('frame', f.url(), JSON.stringify(dl));
    for (let i = 0; i < 5; i++) {
      const has = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some((e) => e.offsetWidth)).catch(() => false);
      if (!has) break;
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(500);
      const cancel = f.getByRole('button', { name: '取消', exact: true });
      if (await cancel.count()) await cancel.first().click({ timeout: 3000, force: true }).catch(() => {});
      await sleep(400);
    }
  }
});
