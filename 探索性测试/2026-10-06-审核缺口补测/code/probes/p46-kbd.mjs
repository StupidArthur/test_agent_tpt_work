import fs from 'node:fs';
import { withApp, sleep } from '../automation/tpt.mjs';
import { closeSettings, openSettings, openSection, openShortcutDialog } from '../automation/settings.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await sleep(300);
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(500);
  const info = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const lis = [...document.querySelectorAll('li')].filter((li) => /新会话|搜索会话/.test(norm(li.innerText)));
    return lis.slice(0, 4).map((li) => {
      const kbds = [...li.querySelectorAll('kbd')].map((k) => norm(k.innerText));
      const btns = [...li.querySelectorAll('button')].map((b) => ({ aria: b.getAttribute('aria-label'), t: norm(b.innerText).slice(0, 20) }));
      return { text: norm(li.innerText).slice(0, 80), kbds, btns, html: li.outerHTML.slice(0, 400) };
    });
  });
  console.log(JSON.stringify(info, null, 2));
});
