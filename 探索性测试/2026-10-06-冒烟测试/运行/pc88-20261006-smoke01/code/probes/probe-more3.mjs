// Probe: inspect "更多" menu DOM.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
try {
  await page.getByRole('button', { name: '更多' }).click();
  await page.waitForTimeout(900);
  const items = await page.evaluate(() => {
    return [...document.querySelectorAll('*')].filter(e => {
      const t = (e.innerText || '').trim();
      return ['技能', '连接器', '数据资产', '专家', '插件'].includes(t) && e.children.length === 0;
    }).map(e => ({ tag: e.tagName, text: e.innerText.trim(), role: e.getAttribute('role'), cls: String(e.className).slice(0, 60), parentTag: e.parentElement.tagName, parentRole: e.parentElement.getAttribute('role'), parentCls: String(e.parentElement.className).slice(0, 80) }));
  });
  console.log('MENU_ITEMS', JSON.stringify(items, null, 2));
  const clickable = await page.evaluate(() => [...document.querySelectorAll('[role=menuitem],[role=button],button,a,li')].filter(e => e.getClientRects().length).map(e => ({ tag: e.tagName, role: e.getAttribute('role'), text: (e.innerText||'').trim().slice(0,30) })).filter(x => x.text));
  console.log('CLICKABLE', JSON.stringify(clickable));
} finally { await browser.close(); }
