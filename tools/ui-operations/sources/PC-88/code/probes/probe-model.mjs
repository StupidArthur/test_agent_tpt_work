// Probe: model + reasoning menu options.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const dump = async (label) => {
  const els = await page.evaluate(() => {
    return [...document.querySelectorAll('[role=menu],[role=listbox],[role=radiogroup],[role=dialog]')].filter(e=>e.getClientRects().length).map(e => ({ role: e.getAttribute('role'), text: e.innerText.trim().slice(0,300) }));
  });
  const body = await page.locator('body').innerText();
  console.log(`== ${label}`, JSON.stringify(els), 'BODY_HAS_LOW', /low|低/.test(body.split('\n').slice(-8).join('|')));
};
try {
  for (let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200); }
  const modelBtn = page.getByRole('button', { name: /选择模型/ });
  console.log('MODELBTN', await modelBtn.count(), JSON.stringify(await modelBtn.first().getAttribute('aria-label')));
  const before = await page.locator('body').innerText();
  await modelBtn.first().click(); await page.waitForTimeout(800);
  console.log('MENU_ADDED', JSON.stringify((await page.locator('body').innerText()).replace(before,'').slice(0,400)));
  // click 推理等级
  const rl = page.getByText('推理等级', { exact: true });
  console.log('RL_COUNT', await rl.count());
  if (await rl.count()) { await rl.first().hover(); await page.waitForTimeout(600); await dump('after hover 推理等级'); }
  const bodyNow = await page.locator('body').innerText();
  console.log('FULL_TAIL', JSON.stringify(bodyNow.split('\n').filter(Boolean).slice(-15)));
} finally { await browser.close(); }
