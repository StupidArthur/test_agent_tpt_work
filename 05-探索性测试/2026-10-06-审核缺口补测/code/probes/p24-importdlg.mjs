import { withApp, sleep } from '../automation/tpt.mjs';
import { openSkills, closeDialogs, backToList, dialogInfo } from '../automation/skills.mjs';
import fs from 'node:fs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  const frame = await openSkills(page);
  await closeDialogs(frame, page);
  await backToList(frame);
  await frame.getByRole('button', { name: '导入技能', exact: true }).click({ timeout: 8000 }).catch((e) => console.log('open err', e.message));
  await sleep(1200);
  const info = await frame.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    if (!dlg) return null;
    const inputs = [...dlg.querySelectorAll('input')].map((i) => ({ type: i.type, accept: i.accept, webkitdirectory: i.hasAttribute('webkitdirectory'), hidden: !(i.offsetWidth || i.offsetHeight), cls: (i.className || '').toString().slice(0, 40) }));
    const btns = [...dlg.querySelectorAll('button')].map((b) => ({ t: norm(b.innerText).slice(0, 20), disabled: b.disabled, aria: b.getAttribute('aria-label') }));
    const tabs = [...dlg.querySelectorAll('[role="tab"]')].map((t) => ({ t: norm(t.innerText), sel: t.getAttribute('aria-selected') }));
    return { text: norm(dlg.innerText).slice(0, 300), inputs, btns, tabs, html: dlg.outerHTML.slice(0, 800) };
  });
  console.log(JSON.stringify(info, null, 2));
  fs.writeFileSync('code/probes/p24-importdlg.json', JSON.stringify(info, null, 2), 'utf8');
});
