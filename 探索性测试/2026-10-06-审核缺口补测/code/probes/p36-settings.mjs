import fs from 'node:fs';
import { withApp, sleep } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await page.keyboard.press('Escape').catch(() => {});
  await page.locator('[data-slot="settings.user"] button[aria-haspopup="menu"]').first().click({ timeout: 8000 }).catch(() => {});
  await sleep(600);
  await page.getByRole('menuitem', { name: '设置', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await sleep(1200);
  const info = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    const rows = [];
    // find label leafs for key settings
    const labels = ['权限', '语言', '外观', '字号大小', '工作步骤展示', '性能与用量', '网页链接默认打开方式', '代码工作工具', '繁忙时的发送行为', '快捷键'];
    for (const lab of labels) {
      const el = [...d.querySelectorAll('*')].find((e) => e.children.length === 0 && norm(e.textContent) === lab);
      if (!el) { rows.push({ label: lab, found: false }); continue; }
      let row = el;
      for (let i = 0; i < 6 && row && row !== d; i++) { row = row.parentElement; if (row && row.querySelectorAll('button,[role="switch"],input').length) break; }
      const ctrls = row ? [...row.querySelectorAll('button,[role="switch"],input')].map((c) => ({ tag: c.tagName, role: c.getAttribute('role'), aria: c.getAttribute('aria-label'), checked: c.getAttribute('aria-checked') ?? c.checked, pressed: c.getAttribute('aria-pressed'), text: norm(c.innerText).slice(0, 30), cls: (c.className || '').toString().slice(0, 30) })) : [];
      rows.push({ label: lab, found: true, text: row ? norm(row.innerText).slice(0, 120) : null, ctrls });
    }
    return { rows };
  });
  console.log(JSON.stringify(info, null, 2));
  fs.writeFileSync('code/probes/p36-settings.json', JSON.stringify(info, null, 2), 'utf8');
});
