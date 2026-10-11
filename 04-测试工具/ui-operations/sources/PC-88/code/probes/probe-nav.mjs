// Probe: open "更多" menu and account menu, dump items. Returns to base state.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const dumpVisible = async (label) => {
  const menu = page.locator('[role="menu"]:visible, [role="dialog"]:visible');
  const n = await menu.count();
  console.log(`== ${label} menus/dialogs=${n}`);
  for (let i = 0; i < n; i++) {
    const t = await menu.nth(i).innerText().catch(() => null);
    console.log(`-- [${i}]`, JSON.stringify(t));
  }
};
try {
  // "更多"
  await page.getByRole('button', { name: '更多' }).click();
  await page.waitForTimeout(800);
  await dumpVisible('after 更多');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // account menu
  await page.locator('button:has-text("Arthur")').first().click();
  await page.waitForTimeout(800);
  await dumpVisible('after account');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
} finally {
  await browser.close();
}
