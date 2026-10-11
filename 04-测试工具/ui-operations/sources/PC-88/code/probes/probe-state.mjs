// Probe: report current app state without clicking.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
try {
  console.log('FRAMES', JSON.stringify(page.frames().map(f => f.url())));
  const main = await page.locator('body').innerText();
  console.log('MAIN_TAIL', JSON.stringify(main.slice(0, 700)));
  console.log('SIDEBAR_ACTION_技能', await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).count());
  console.log('HOME_NEWTASK', await page.getByRole('button', { name: '新建任务' }).count());
} finally { await browser.close(); }
