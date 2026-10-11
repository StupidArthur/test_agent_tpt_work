import { withApp, sleep } from '../automation/tpt.mjs';
import { openSkills, closeDialogs, backToList } from '../automation/skills.mjs';
import fs from 'node:fs';
import path from 'node:path';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
const skillPath = path.resolve('夹具/基础/20261006-agent2/skill.md');
await withApp(ctx, async (page) => {
  const frame = await openSkills(page);
  await closeDialogs(frame, page);
  await backToList(frame);
  await frame.getByRole('button', { name: '导入技能', exact: true }).click({ timeout: 8000 });
  await sleep(1200);
  const input = frame.locator('[role="dialog"] input[type="file"]').first();
  console.log('input count', await input.count());
  await input.setInputFiles(skillPath);
  await sleep(1500);
  const info = await frame.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    const imp = dlg ? [...dlg.querySelectorAll('button')].find((b) => norm(b.innerText) === '导入') : null;
    return { text: norm(dlg.innerText).slice(0, 400), importDisabled: imp ? imp.disabled : null };
  });
  console.log(JSON.stringify(info, null, 2));
});
