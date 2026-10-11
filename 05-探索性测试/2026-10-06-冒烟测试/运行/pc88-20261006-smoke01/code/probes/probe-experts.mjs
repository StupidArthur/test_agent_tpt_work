// Probe: close dialogs, composer attachment entry, experts page.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const expertsFrame = () => page.frames().find(f => f.url().includes('supcon-experts') || (f.url().includes('/api/') && f !== page.mainFrame()));
try {
  // close any open dialogs
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  console.log('DIALOGS_AFTER_ESC', await page.locator('[role=dialog]:visible').count());
  // composer attachment entry
  const add = page.getByRole('button', { name: '添加文件或调用指令' });
  console.log('ADD_COUNT', await add.count());
  if (await add.count()) {
    const before = await page.locator('body').innerText();
    await add.first().click(); await page.waitForTimeout(700);
    console.log('ADD_MENU', JSON.stringify((await page.locator('body').innerText()).replace(before, '').slice(0, 400)));
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  }
  // input file in composer
  const files = await page.locator('input[type=file]').evaluateAll(els => els.map(e => ({ accept: e.accept, cls: String(e.className).slice(0,30), hidden: e.offsetParent === null })));
  console.log('COMPOSER_FILE_INPUTS', JSON.stringify(files));
  // experts page
  if (await page.locator('button.tpt-sidebar-action', { hasText: '专家' }).count() === 0) {
    await page.getByRole('button', { name: '更多' }).click(); await page.waitForTimeout(500);
  }
  await page.locator('button.tpt-sidebar-action', { hasText: '专家' }).click();
  await page.waitForTimeout(2500);
  console.log('FRAMES', JSON.stringify(page.frames().map(f => f.url())));
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const t = await f.locator('body').innerText().catch(()=> '');
    console.log(`FRAME ${f.url()}:\n${t.slice(0, 1500)}\n---`);
  }
} finally { await browser.close(); }
