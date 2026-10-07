// Probe: shortcuts dialog row structure.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
try {
  for(let i=0;i<3;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);}
  await page.locator('button', { hasText: 'Arthur' }).first().click(); await page.waitForTimeout(700);
  await page.getByText('设置', { exact: true }).click(); await page.waitForTimeout(1500);
  await page.getByText('编辑快捷键', { exact: true }).click(); await page.waitForTimeout(1200);
  const rows = await page.evaluate(() => {
    const dlgs = [...document.querySelectorAll('[role=dialog]')].filter(e=>e.getClientRects().length);
    const d = dlgs[dlgs.length-1];
    if (!d) return { err:'no dialog' };
    const out = [];
    for (const el of d.querySelectorAll('*')) {
      if (el.children.length === 0 && /^(新会话|搜索会话)$/.test((el.textContent||'').trim())) {
        out.push({ label: el.textContent.trim(), rowText: el.parentElement ? el.parentElement.innerText.replace(/\n+/g,' ') : null, rowHtml: el.parentElement ? el.parentElement.outerHTML.slice(0,250) : null });
      }
    }
    return { out };
  });
  console.log(JSON.stringify(rows, null, 2));
} finally { await browser.close(); }
