import { withApp, sleep } from '../automation/tpt.mjs';
import { openSkills, closeDialogs, backToList, dialogInfo } from '../automation/skills.mjs';
import fs from 'node:fs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  const frame = await openSkills(page);
  console.log('dialogs before', JSON.stringify(await dialogInfo(frame)));
  await closeDialogs(frame, page);
  console.log('dialogs after close', JSON.stringify(await dialogInfo(frame)));
  await backToList(frame);
  const st = await frame.evaluate(() => ({ detail: !!document.querySelector('[class*="_page_"]'), dialogs: [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.offsetWidth).length, cards: document.querySelectorAll('[data-slot="card"]').length }));
  console.log('state', JSON.stringify(st));
});
