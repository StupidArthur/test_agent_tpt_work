// Probe: settings dialog + shortcuts dialog.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
async function openAccountMenu() {
  if (await page.getByText('设置', { exact: true }).count()) return;
  await page.locator('button', { hasText: 'Arthur' }).first().click();
  await page.waitForTimeout(700);
}
try {
  await openAccountMenu();
  await page.getByText('设置', { exact: true }).click();
  await page.waitForTimeout(1500);
  console.log('SETTINGS_DIALOGS', JSON.stringify((await page.locator('[role=dialog]:visible').allInnerTexts().catch(()=>[]))));
  const btns = await page.locator('[role=dialog]:visible button, [role=dialog]:visible [role=button]').evaluateAll(els => els.filter(e=>e.getClientRects().length).map(e => (e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,40)).filter(Boolean));
  console.log('SETTINGS_BUTTONS', JSON.stringify(btns));
  const labels = await page.locator('[role=dialog]:visible').innerText().catch(()=> '');
  console.log('HAS_PERM', /权限/.test(labels), 'HAS_LANG', /语言/.test(labels), 'HAS_APPEAR', /外观/.test(labels));
  // click 编辑快捷键
  const kb = page.getByText('编辑快捷键', { exact: false });
  console.log('KB_COUNT', await kb.count());
  if (await kb.count()) {
    await kb.first().click();
    await page.waitForTimeout(1200);
    console.log('AFTER_KB_DIALOGS', JSON.stringify((await page.locator('[role=dialog]:visible').allInnerTexts().catch(()=>[]))));
  }
} finally { await browser.close(); }
