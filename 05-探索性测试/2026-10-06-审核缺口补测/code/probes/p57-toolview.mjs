import fs from 'node:fs';
import { withApp, sleep, newTask, selectProject, typeAndSend, waitTerminal } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await newTask(page);
  await selectProject(page).catch(() => {});
  await typeAndSend(page, '请在目录 D:\\code\\tpt-workspace\\.fast-assert-20261006-agent2 中读取 long.txt 文件，然后只回复该文件最后一行的内容。');
  await waitTerminal(page, { timeout: 180000 });
  await sleep(2500);
  const dump = () => page.evaluate(() => {
    const views = [...document.querySelectorAll('[data-slot="tool.call.toolview"]')];
    return views.map((v) => ({
      outer: v.outerHTML.slice(0, 3000),
      text: (v.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
      aria: [...v.querySelectorAll('[aria-expanded]')].map((e) => ({ cls: (e.className || '').toString().slice(0, 40), exp: e.getAttribute('aria-expanded') })),
    }));
  });
  console.log('BEFORE', JSON.stringify(await dump(), null, 2).slice(0, 1500));
  await page.evaluate(() => {
    const views = [...document.querySelectorAll('[data-slot="tool.call.toolview"]')];
    const v = views[views.length - 1];
    const t = v && v.querySelector('[aria-expanded="false"]');
    if (t) t.click();
  });
  await sleep(2500);
  const after = await dump();
  fs.writeFileSync('code/probes/p57-toolview.json', JSON.stringify(after, null, 2), 'utf8');
  console.log('AFTER', JSON.stringify(after, null, 2).slice(0, 4000));
});
