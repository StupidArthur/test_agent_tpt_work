// Probe: select skill chip and inspect identity.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
try {
  // picker currently open from previous probe; if not, reopen
  let item = page.getByRole('menuitem', { name: /本轮快速回归技能/ });
  if (await item.count() === 0) {
    await page.getByRole('button', { name: '添加文件或调用指令' }).click(); await page.waitForTimeout(500);
    await page.getByText('技能', { exact: true }).last().click(); await page.waitForTimeout(1000);
    item = page.getByRole('menuitem', { name: /本轮快速回归技能/ });
  }
  await item.first().click(); await page.waitForTimeout(1000);
  const chips = await page.evaluate(() => [...document.querySelectorAll('*')].filter(e=>e.getClientRects().length && /chip|Chip|ref|Ref|attachment|Token/i.test(String(e.className))).map(e=>({tag:e.tagName,cls:String(e.className).slice(0,50),text:(e.innerText||'').trim().slice(0,50),data:[...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name+'='+a.value).join(',')})).filter(x=>x.text));
  console.log('CHIPS', JSON.stringify(chips, null, 2));
  const body = await page.locator('body').innerText();
  console.log('BODY_TAIL', JSON.stringify(body.split('\n').filter(Boolean).slice(-10)));
} finally { await browser.close(); }
