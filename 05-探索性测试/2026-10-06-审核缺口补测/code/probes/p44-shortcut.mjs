import fs from 'node:fs';
import { withApp, sleep } from '../automation/tpt.mjs';
import { closeSettings, openSettings, openSection, openShortcutDialog } from '../automation/settings.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await closeSettings(page);
  await openSettings(page);
  await openSection(page, '常规');
  await openShortcutDialog(page);
  const info = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const ds = [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.offsetWidth);
    const d = ds[ds.length - 1];
    if (!d) return null;
    const rows = [...d.querySelectorAll('*')].filter((e) => e.children.length === 0 && norm(e.textContent) === '新会话');
    const out = { rows: rows.length, sample: null };
    if (rows[0]) {
      let r = rows[0];
      for (let i = 0; i < 5 && r && r !== d; i++) { r = r.parentElement; if (r && /Ctrl/.test(r.innerText)) break; }
      out.sample = { outer: r ? r.outerHTML.slice(0, 800) : null };
    }
    return out;
  });
  console.log(JSON.stringify(info, null, 2).slice(0, 2000));
});
