import fs from 'node:fs';
import { withApp, sleep } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(600);
  await page.locator('[aria-label="排序方式"]').first().click({ timeout: 6000 }).catch((e) => console.log('click err', e.message));
  await sleep(1200);
  const info = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const menus = [...document.querySelectorAll('[role="menu"]')].filter((e) => e.offsetWidth);
    const m = menus[menus.length - 1];
    if (!m) return null;
    return { text: norm(m.innerText), items: [...m.querySelectorAll('[role="menuitem"]')].map((i) => ({ t: norm(i.innerText), cls: (i.className || '').toString(), aria: i.getAttribute('aria-checked'), state: i.getAttribute('data-state'), html: i.outerHTML.slice(0, 400) })) };
  });
  console.log(JSON.stringify(info, null, 2));
});
