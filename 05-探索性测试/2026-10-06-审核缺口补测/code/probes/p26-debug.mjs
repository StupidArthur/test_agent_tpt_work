import { withApp, sleep } from '../automation/tpt.mjs';
import { ensureList, openImportDialog, setFileAndConfirm } from '../automation/skills.mjs';
import fs from 'node:fs';
import path from 'node:path';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
const skillPath = path.resolve('夹具/基础/20261006-agent2/skill.md');
console.log('skillPath exists', fs.existsSync(skillPath));
await withApp(ctx, async (page) => {
  const frame = await ensureList(page);
  const dlgBefore = await frame.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.offsetWidth).map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 80)));
  console.log('dialogs before open', JSON.stringify(dlgBefore));
  await openImportDialog(frame);
  const input = frame.locator('[role="dialog"] input[type="file"]').first();
  console.log('input count', await input.count());
  await input.setInputFiles(skillPath);
  await sleep(1500);
  const t = await frame.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    return d ? d.innerText.replace(/\s+/g, ' ').slice(0, 300) : null;
  });
  console.log('after setInputFiles:', JSON.stringify(t));
  const imp = frame.locator('[role="dialog"]').getByRole('button', { name: '导入', exact: true }).first();
  console.log('import disabled?', await imp.isDisabled().catch((e) => 'ERR' + e.message));
});
