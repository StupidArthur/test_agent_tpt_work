import { withApp, sleep } from '../automation/tpt.mjs';
import { openSkills, closeDialogs, backToList, openImportDialog } from '../automation/skills.mjs';
import fs from 'node:fs';
import path from 'node:path';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
const file = path.resolve('夹具/基础/20261006-agent2/skill-b.md');
await withApp(ctx, async (page) => {
  console.log('reloading main page');
  await page.reload({ waitUntil: 'domcontentloaded' }).catch((e) => console.log('reload err', e.message));
  await sleep(6000);
  const frame = await openSkills(page);
  await closeDialogs(frame, page);
  await backToList(frame);
  await openImportDialog(frame);
  await frame.locator('[role="dialog"] input[type="file"][accept*=".zip"]').first().setInputFiles(file);
  await sleep(2500);
  const t = await frame.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth); return d ? d.innerText.replace(/\s+/g, ' ').slice(0, 200) : null; });
  console.log('after reload set', JSON.stringify(t));
});
