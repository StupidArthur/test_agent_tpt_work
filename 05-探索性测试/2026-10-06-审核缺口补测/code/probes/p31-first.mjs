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
  const input = frame.locator('[role="dialog"] input[type="file"]').first();
  console.log('count', await frame.locator('[role="dialog"] input[type="file"]').count(), 'accept', await input.getAttribute('accept'));
  await input.setInputFiles(file);
  await sleep(2500);
  const t = await frame.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth); return d ? d.innerText.replace(/\s+/g, ' ').slice(0, 200) : null; });
  console.log('after .first()', JSON.stringify(t));
  // also try evaluate dispatching change manually with DataTransfer not possible; instead read input.files
  const filesInfo = await frame.evaluate(() => {
    const i = document.querySelector('[role="dialog"] input[type="file"]');
    return { files: i.files ? i.files.length : null, name: i.files && i.files[0] ? i.files[0].name : null };
  });
  console.log('input.files', JSON.stringify(filesInfo));
});
