// Probe: add attachments and inspect card structure.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const dir = 'F:/code_ai/test_agent_tpt_work/探索性测试/2026-10-06-业务函数复用回归/夹具/本轮/fn-20261006-agent2/attachments';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  // open add menu and choose 添加本地文件
  await page.locator('button[aria-label="添加文件或调用指令"]').first().click();
  await page.waitForTimeout(1000);
  const menu = page.getByText('添加本地文件', { exact: true }).first();
  if (await menu.count()) { await menu.click(); await page.waitForTimeout(800); }
  const input = page.locator('input[type="file"][multiple]').first();
  await input.setInputFiles([`${dir}/attachment-a.txt`, `${dir}/attachment-b.txt`, `${dir}/attachment-c.md`]);
  await page.waitForTimeout(2000);
  const dump = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const area = document.querySelector('[data-slot="conversation.input.attachments"]');
    const html = area ? area.outerHTML.slice(0, 1800) : null;
    const names = area ? [...area.querySelectorAll('[title],[aria-label]')].map(e => ({ tag: e.tagName, title: e.getAttribute('title'), aria: e.getAttribute('aria-label'), text: (e.innerText||'').trim().slice(0,30) })).slice(0, 20) : [];
    return { area: !!area, html, names };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
