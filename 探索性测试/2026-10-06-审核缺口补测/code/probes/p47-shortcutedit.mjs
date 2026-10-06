import fs from 'node:fs';
import { withApp, sleep } from '../automation/tpt.mjs';
import { closeSettings, openSettings, openSection, openShortcutDialog } from '../automation/settings.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await closeSettings(page);
  await openSettings(page);
  await openSection(page, '常规');
  await openShortcutDialog(page);
  const read = () => page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const li = [...document.querySelectorAll('li')].find((x) => norm(x.innerText).startsWith('新会话'));
    if (!li) return null;
    return { kbds: [...li.querySelectorAll('kbd')].map((k) => norm(k.innerText)).join(' '), text: norm(li.innerText).slice(0, 60) };
  });
  console.log('before', JSON.stringify(await read()));
  // click row button
  await page.evaluate(() => { const li = [...document.querySelectorAll('li')].find((x) => x.innerText.replace(/\s+/g, ' ').trim().startsWith('新会话')); const b = li && li.querySelector('button[aria-label^="修改"]'); if (b) b.click(); });
  await sleep(800);
  console.log('after rowbtn', JSON.stringify(await read()));
  await page.evaluate(() => { const li = [...document.querySelectorAll('li')].find((x) => x.innerText.replace(/\s+/g, ' ').trim().startsWith('新会话')); const b = li && li.querySelector('button[aria-label="按下快捷键"]'); if (b) b.click(); });
  await sleep(400);
  await page.keyboard.press('Control+Alt+Shift+F9');
  await sleep(1200);
  console.log('after keys', JSON.stringify(await read()));
  // try clicking outside to commit
  await page.keyboard.press('Tab');
  await sleep(1000);
  console.log('after tab', JSON.stringify(await read()));
  await page.screenshot({ path: 'code/probes/p47-shortcut.png' });
});
