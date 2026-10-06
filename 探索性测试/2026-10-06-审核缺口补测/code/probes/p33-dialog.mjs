import { withApp, sleep } from '../automation/tpt.mjs';
import { openSkills, closeDialogs, backToList, openImportDialog } from '../automation/skills.mjs';
import fs from 'node:fs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  const frame = await openSkills(page);
  console.log('frame url', frame.url());
  await closeDialogs(frame, page);
  await backToList(frame);
  await openImportDialog(frame);
  const html = await frame.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    return d ? d.outerHTML : null;
  });
  fs.writeFileSync('code/probes/p33-dialog.html', html || '', 'utf8');
  console.log('len', (html || '').length);
  console.log(html.slice(0, 2500));
});
