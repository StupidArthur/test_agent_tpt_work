import fs from 'node:fs';
import { withApp, sleep } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await page.locator('[aria-label="排序方式"]').first().click({ timeout: 6000 }).catch(() => {});
  await sleep(1000);
  const info = await page.evaluate(() => {
    const m = [...document.querySelectorAll('[role="menu"]')].find((e) => e.offsetWidth);
    if (!m) return null;
    return [...m.querySelectorAll('[role="menuitem"]')].map((i) => ({ t: i.innerText.replace(/\s+/g, ' ').trim(), cls: (i.className || '').toString(), html: i.outerHTML.slice(0, 500) }));
  });
  console.log(JSON.stringify(info, null, 2));
});
