// Probe: work-steps panel in 对话 view.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const tab = page.getByText('对话', { exact: true }).first();
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(1500); }
  const info = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const panels = [...document.querySelectorAll('[aria-expanded]')].filter(vis).map(e => ({ tag: e.tagName, aria: e.getAttribute('aria-expanded'), text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40), cls: (e.className || '').toString().split(' ')[0] }));
    const workText = [...document.querySelectorAll('*')].filter(vis).map(e => (e.innerText || '').trim()).filter(t => t === '已完成工作');
    return { panels: panels.slice(0, 20), hasWork: workText.length };
  });
  console.log(JSON.stringify(info, null, 2));
} finally { await browser.close(); }
