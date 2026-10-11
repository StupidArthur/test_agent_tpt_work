import { withApp, dump, sleep, newTask } from './lib.mjs';
await withApp(async (page) => {
  const readPerm = () => page.evaluate(() => { const e = [...document.querySelectorAll('*')].find(x => x.children.length === 0 && /仅可查看|工作区内修改|完全权限/.test(x.textContent || '')); return e ? e.textContent.trim() : null; });
  const a = await readPerm();
  await newTask(page);
  await sleep(1500);
  const b = await readPerm();
  dump('perm-probe', { current: a, newTask: b });
});
