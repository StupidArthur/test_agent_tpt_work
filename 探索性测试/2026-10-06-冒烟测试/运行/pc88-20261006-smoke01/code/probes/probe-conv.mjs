// Probe: wait for idle, inspect conversation message DOM.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
try {
  const deadline = Date.now() + 95000;
  while (Date.now() < deadline) {
    const stop = await page.getByRole('button', { name: /停止/ }).count();
    const body = await page.locator('body').innerText();
    const running = /探索中|思考中|生成中|进行中/.test(body);
    if (!stop && !running) break;
    await page.waitForTimeout(2000);
  }
  const body = await page.locator('body').innerText();
  console.log('IDLE_BODY_TAIL', JSON.stringify(body.split('\n').filter(Boolean).slice(-22)));
  const nodes = await page.evaluate(() => {
    const cand = [...document.querySelectorAll('*')].filter(e => {
      const t = (e.innerText||'').trim();
      return /SMOKE_CHAT_pc88/.test(t) && e.children.length <= 6 && t.length < 200;
    });
    return cand.slice(0, 12).map(e => ({ tag: e.tagName, cls: String(e.className).slice(0,70), role: e.getAttribute('role'), data: [...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name+'='+a.value).join(','), text: e.innerText.trim().slice(0,90), parentCls: String(e.parentElement.className).slice(0,60) }));
  });
  console.log('CHAT_NODES', JSON.stringify(nodes, null, 2));
} finally { await browser.close(); }
