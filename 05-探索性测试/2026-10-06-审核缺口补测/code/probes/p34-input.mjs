import { withApp, sleep } from '../automation/tpt.mjs';
import { openSkills, closeDialogs, backToList, openImportDialog } from '../automation/skills.mjs';
import fs from 'node:fs';
import path from 'node:path';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
const file = path.resolve('夹具/基础/20261006-agent2/skill-b.md');
await withApp(ctx, async (page) => {
  const frame = await openSkills(page);
  await closeDialogs(frame, page);
  await backToList(frame);
  await openImportDialog(frame);
  await frame.evaluate(() => {
    window.__ev = [];
    const i = document.querySelector('[role="dialog"] input[type="file"]');
    ['change', 'input'].forEach((ev) => i.addEventListener(ev, () => { window.__ev.push([ev, i.files.length]); }));
    window.__input = i;
  });
  const input = frame.locator('[role="dialog"] input[type="file"]').first();
  await input.setInputFiles(file);
  const immediate = await frame.evaluate(() => ({ files: window.__input.files.length, ev: window.__ev, same: document.querySelector('[role="dialog"] input[type="file"]') === window.__input }));
  console.log('immediate', JSON.stringify(immediate));
  await sleep(2000);
  const later = await frame.evaluate(() => ({ files: window.__input.files.length, ev: window.__ev, inDom: document.contains(window.__input) }));
  console.log('later', JSON.stringify(later));
});
