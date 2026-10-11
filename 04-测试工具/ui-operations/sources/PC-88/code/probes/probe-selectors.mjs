// Probe: model selector, project selector, skills page, experts page. Read-only exploration.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const body = () => page.locator('body').innerText();
const added = async (before) => (await body()).replace(before, '');
try {
  // --- model selector ---
  let before = await body();
  await page.getByRole('button', { name: /选择模型/ }).click();
  await page.waitForTimeout(700);
  console.log('MODEL_MENU', JSON.stringify(await added(before)));
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);

  // --- project selector ---
  before = await body();
  await page.getByRole('button', { name: '选择项目' }).click();
  await page.waitForTimeout(700);
  console.log('PROJECT_MENU', JSON.stringify(await added(before)));
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);

  // --- 更多 -> 技能 ---
  await page.getByRole('button', { name: '更多' }).click();
  await page.waitForTimeout(500);
  await page.getByText('技能', { exact: true }).click();
  await page.waitForTimeout(1500);
  console.log('SKILLS_URL', page.url());
  console.log('SKILLS_BODY', JSON.stringify((await body()).slice(0, 2500)));
  console.log('SKILLS_FRAMES', page.frames().map(f => f.url()));
} finally {
  await browser.close();
}
