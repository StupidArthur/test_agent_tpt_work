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
  // try filechooser interception
  const btn = frame.getByRole('button', { name: '选择文件', exact: true });
  console.log('btn count', await btn.count());
  try {
    const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 8000 }), btn.click()]);
    await chooser.setFiles(file);
    await sleep(2000);
    const t = await frame.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth); return d ? d.innerText.replace(/\s+/g, ' ').slice(0, 200) : null; });
    console.log('after chooser', JSON.stringify(t));
  } catch (e) {
    console.log('chooser err', e.message);
    // fallback: reload skills frame then set input
    await frame.evaluate(() => location.reload()).catch(() => {});
    await sleep(3000);
    const f2 = await openSkills(page);
    await backToList(f2);
    await openImportDialog(f2);
    await f2.locator('[role="dialog"] input[type="file"][accept*=".zip"]').first().setInputFiles(file);
    await sleep(2000);
    const t2 = await f2.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth); return d ? d.innerText.replace(/\s+/g, ' ').slice(0, 200) : null; });
    console.log('after reload+set', JSON.stringify(t2));
  }
});
