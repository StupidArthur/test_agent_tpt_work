import fs from 'node:fs';
import { withApp, sleep, newTask, selectProject, typeAndSend, waitTerminal } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await newTask(page); await selectProject(page).catch(() => {});
  await typeAndSend(page, '请在目录 D:\\code\\tpt-workspace\\.fast-assert-20261006-agent2 中读取 long.txt 文件，然后只回复该文件最后一行的内容。');
  await waitTerminal(page, { timeout: 180000 }); await sleep(1500);
  const measure = () => page.evaluate(() => {
    const views = [...document.querySelectorAll('[data-slot="tool.call.toolview"]')];
    const v = views[views.length - 1];
    if (!v) return null;
    const cands = [...v.querySelectorAll('*')].filter((e) => e.scrollHeight - e.clientHeight > 4);
    return {
      aria: [...v.querySelectorAll('[aria-expanded]')].map((e) => ({ c: (e.className || '').toString().slice(0, 40), exp: e.getAttribute('aria-expanded') })),
      scrollables: cands.map((e) => ({ cls: (e.className || '').toString().slice(0, 60), sh: e.scrollHeight, ch: e.clientHeight, ov: getComputedStyle(e).overflowY })),
      readBody: (() => { const b = v.querySelector('[class*="readBody"]'); return b ? { sh: b.scrollHeight, ch: b.clientHeight, ov: getComputedStyle(b).overflowY } : null; })(),
      textHas200: v.textContent.includes('FAST_LONG_LINE_200'),
    };
  });
  console.log('collapsed', JSON.stringify(await measure()));
  await page.evaluate(() => {
    const views = [...document.querySelectorAll('[data-slot="tool.call.toolview"]')];
    const v = views[views.length - 1];
    const rows = [...v.querySelectorAll('[aria-expanded="false"]')];
    // click the OUTER disclosure row (class row_wloit) if present
    const outer = rows.find((r) => /wloit/.test((r.className || '').toString())) || rows[0];
    if (outer) outer.click();
  });
  await sleep(2500);
  console.log('expanded', JSON.stringify(await measure()));
});
