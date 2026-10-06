import fs from 'node:fs';
import { withApp, sleep } from '../automation/tpt.mjs';
import { closeSettings, openSettings, openSection, openShortcutDialog } from '../automation/settings.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await closeSettings(page);
  await openSettings(page);
  await openSection(page, '常规');
  await openShortcutDialog(page);
  const info = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const lis = [...document.querySelectorAll('li')].filter((li) => norm(li.innerText).includes('新会话'));
    return lis.slice(0, 3).map((li) => ({ text: norm(li.innerText).slice(0, 120), html: li.outerHTML.slice(0, 1200) }));
  });
  console.log(JSON.stringify(info, null, 2).slice(0, 3000));
});
