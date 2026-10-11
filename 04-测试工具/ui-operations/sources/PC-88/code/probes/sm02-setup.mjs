// Step: SM-02 setup — new task, project, reasoning low. Inspect DOM (no send).
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const J = (o) => JSON.stringify(o);
try {
  for (let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200); }
  const nt = page.getByRole('button', { name: '新建任务' });
  if (await nt.count()) { await nt.first().click(); await page.waitForTimeout(1000); }

  const tb = page.getByRole('textbox');
  const tbCount = await tb.count();
  const tbVisible = tbCount ? await tb.first().isVisible() : false;
  const tbEditable = tbCount ? await tb.first().isEditable() : false;
  console.log('TEXTBOX', J({ tbCount, tbVisible, tbEditable }));

  // project select
  await page.getByRole('button', { name: '选择项目' }).click(); await page.waitForTimeout(700);
  const menuText = await page.locator('body').innerText();
  console.log('PROJECT_MENU_TAIL', J(menuText.split('\n').filter(Boolean).slice(-6)));
  await page.getByText('smoketest', { exact: true }).first().click(); await page.waitForTimeout(800);
  const projBtn = page.getByRole('button', { name: /选择项目|smoketest/ }).first();
  console.log('PROJECT_BTN', J(await projBtn.getAttribute('aria-label')), J((await projBtn.innerText()).trim()));

  // reasoning low
  await page.getByRole('button', { name: /选择模型/ }).click(); await page.waitForTimeout(600);
  await page.getByText('推理等级', { exact: true }).click(); await page.waitForTimeout(600);
  await page.getByRole('menuitemradio', { name: 'low' }).click(); await page.waitForTimeout(600);
  const modelBtn = page.getByRole('button', { name: /选择模型/ });
  console.log('MODEL_NOW', J(await modelBtn.getAttribute('aria-label')), J((await modelBtn.innerText()).trim()), J(await modelBtn.getAttribute('title')));

  // chips / references
  const chips = await page.evaluate(() => [...document.querySelectorAll('[data-chip],[class*=chip],[class*=Chip],[aria-label*=技能],[aria-label*=专家]')].filter(e=>e.getClientRects().length).map(e=>e.innerText.trim().slice(0,30)).filter(Boolean));
  console.log('CHIPS', J(chips));
  const fileInputs = await page.locator('input[type=file]').evaluateAll(els => els.map(e => ({ accept: e.accept, visible: e.getClientRects().length>0 })));
  console.log('FILE_INPUTS', J(fileInputs));
  console.log('BODY_TAIL', J((await page.locator('body').innerText()).split('\n').filter(Boolean).slice(-14)));
} finally { await browser.close(); }
