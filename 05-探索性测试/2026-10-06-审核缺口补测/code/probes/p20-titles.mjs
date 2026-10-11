import { withApp, sleep } from '../automation/tpt.mjs';
import fs from 'node:fs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  const titles = await page.evaluate(() => [...document.querySelectorAll('[data-slot="sidebar.workspaces.session.row.action"], .YDXeBa_sessionRow')].map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60)).filter(Boolean));
  console.log('TITLES', JSON.stringify(titles, null, 2));
});
