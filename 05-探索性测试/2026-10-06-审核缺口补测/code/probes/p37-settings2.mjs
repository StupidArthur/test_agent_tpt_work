import fs from 'node:fs';
import { withApp, sleep } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  // real settings dialog may already be open
  const dlg = page.locator('[role="dialog"]:visible').first();
  const permBtn = dlg.locator('button').filter({ hasText: /^工作区内修改$/ }).first();
  console.log('perm btn count', await permBtn.count());
  await permBtn.click({ timeout: 8000 }).catch((e) => console.log('perm click err', e.message));
  await sleep(700);
  const menu = await page.evaluate(() => [...document.querySelectorAll('[role="menu"]')].filter((e) => e.offsetWidth).map((m) => ({ text: m.innerText.replace(/\s+/g, ' '), items: [...m.querySelectorAll('[role="menuitem"],[role="option"],button')].map((i) => i.innerText.replace(/\s+/g, ' ').trim()) })));
  console.log('PERM MENU', JSON.stringify(menu));
  await page.keyboard.press('Escape');
  await sleep(400);
  // shortcut editor
  const sc = page.getByRole('button', { name: '编辑快捷键' }).first();
  console.log('sc count', await sc.count());
  await sc.click({ timeout: 8000 }).catch((e) => console.log('sc err', e.message));
  await sleep(1200);
  const info = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const ds = [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.offsetWidth);
    const d = ds[ds.length - 1];
    return { count: ds.length, text: d ? norm(d.innerText).slice(0, 1500) : null, rows: d ? [...d.querySelectorAll('tr,[class*="row"]')].slice(0, 40).map((r) => norm(r.innerText).slice(0, 80)) : [] };
  });
  console.log(JSON.stringify(info, null, 2));
  fs.writeFileSync('code/probes/p37-settings2.json', JSON.stringify(info, null, 2), 'utf8');
});
