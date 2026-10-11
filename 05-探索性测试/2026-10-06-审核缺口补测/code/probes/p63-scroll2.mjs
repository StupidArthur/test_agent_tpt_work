import fs from 'node:fs';
import { withApp, sleep, newTask, selectProject, typeAndSend, waitTerminal } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await newTask(page); await selectProject(page).catch(() => {});
  await typeAndSend(page, '请在目录 D:\\code\\tpt-workspace\\.fast-assert-20261006-agent2 中读取 long.txt 文件，然后只回复该文件最后一行的内容。');
  await waitTerminal(page, { timeout: 180000 }); await sleep(1500);
  const m = () => page.evaluate(() => {
    const views = [...document.querySelectorAll('[data-slot="tool.call.toolview"]')];
    const v = views[views.length - 1]; if (!v) return null;
    const body = v.querySelector('[class*="readBody"]');
    const cands = [...v.querySelectorAll('*')].filter((e) => e.scrollHeight - e.clientHeight > 4);
    return { readBody: body ? { sh: body.scrollHeight, ch: body.clientHeight, ov: getComputedStyle(body).overflowY } : null, scrollables: cands.map((e) => ({ cls: (e.className || '').toString().slice(0, 50), sh: e.scrollHeight, ch: e.clientHeight })), aria: [...v.querySelectorAll('[aria-expanded]')].map((e) => ({ c: (e.className || '').toString().slice(0, 40), exp: e.getAttribute('aria-expanded') })) };
  });
  await page.evaluate(() => { const v = [...document.querySelectorAll('[data-slot="tool.call.toolview"]')].at(-1); const o = [...v.querySelectorAll('[aria-expanded="false"]')].find((r) => /wloit/.test((r.className || '').toString())); if (o) o.click(); });
  await sleep(2000);
  console.log('after outer', JSON.stringify(await m()));
  const inner = page.locator('[class*="_expand_of8ii_57"]').last();
  console.log('inner count', await inner.count());
  if (await inner.count()) { await inner.click({ timeout: 5000 }).catch((e) => console.log('inner err', e.message)); await sleep(2000); }
  console.log('after inner click', JSON.stringify(await m()));
});
