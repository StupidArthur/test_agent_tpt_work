import fs from 'node:fs';
import { withApp, sleep } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  const info = await page.evaluate(() => {
    const root = document.querySelector('[class*="TS9iAW_root"]');
    if (!root) return null;
    const children = [...root.querySelectorAll('*')].map((e) => ({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 40), text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80) }));
    return { text: root.innerText, html: root.outerHTML.slice(0, 2000), children: children.slice(0, 20) };
  });
  console.log(JSON.stringify(info, null, 2).slice(0, 3000));
});
