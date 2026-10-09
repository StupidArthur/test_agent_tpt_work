import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const sf = page.frames().find(f => f.url().includes('supcon-skills'));
const NAME = 'smoke-skill-pc88-20261006-smoke01';
try {
  await sf.locator('input[placeholder="搜索技能名称或描述"]').fill(NAME);
  page.waitForTimeout?.(0);
  await page.waitForTimeout(1200);
  await sf.locator('.card-title').first().click({ timeout: 5000 }).catch(e => console.log('title click err', e.message.slice(0,60)));
  await page.waitForTimeout(1500);
  console.log('FRAME_URL', sf.url());
  console.log('DIALOGS', await sf.locator('[role=dialog]').count());
  const b = await sf.locator('body').innerText();
  console.log('BODY_LEN', b.length);
  console.log('BODY', JSON.stringify(b.slice(0, 900)));
} finally { await browser.close(); }
