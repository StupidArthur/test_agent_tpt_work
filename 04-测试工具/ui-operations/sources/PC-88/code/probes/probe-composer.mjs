// Probe: new task composer + attachment.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
try {
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  // go home
  const nt = page.getByRole('button', { name: '新建任务' });
  if (await nt.count()) { await nt.first().click(); await page.waitForTimeout(1200); }
  console.log('URL', page.url(), 'FRAMES', JSON.stringify(page.frames().map(f=>f.url())));
  console.log('BODY', JSON.stringify((await page.locator('body').innerText()).slice(0, 900)));
  const files = await page.locator('input[type=file]').evaluateAll(els => els.map(e => ({ accept: e.accept, cls: String(e.className).slice(0,30), visible: e.getClientRects().length>0 })));
  console.log('FILE_INPUTS', JSON.stringify(files));
  const add = page.getByRole('button', { name: '添加文件或调用指令' });
  console.log('ADD_COUNT', await add.count());
  if (await add.count()) {
    const before = await page.locator('body').innerText();
    await add.first().click(); await page.waitForTimeout(700);
    console.log('ADD_MENU', JSON.stringify((await page.locator('body').innerText()).replace(before,'').slice(0,300)));
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  }
} finally { await browser.close(); }
