// Probe: find 产物卡 with resource path; open p2 session and dump paths/anchors + right sidebar.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const p2 = page.getByText('P2-PROBE-OK', { exact: false }).first();
  if (await p2.count()) { await p2.click(); await page.waitForTimeout(2000); }
  const dump = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const anchors = [...document.querySelectorAll('a')].filter(vis).map(a => ({ href: a.getAttribute('href'), text: (a.innerText || '').trim().slice(0, 80) }));
    const pathAttrs = [];
    for (const el of document.querySelectorAll('*')) {
      for (const a of el.attributes || []) {
        if (/path|file|href|artifact|resource|download/i.test(a.name)) pathAttrs.push({ slot: el.getAttribute('data-slot'), name: a.name, value: String(a.value).slice(0, 120), cls: (el.className || '').toString().slice(0, 40) });
      }
    }
    return { anchors, pathAttrs: pathAttrs.slice(0, 80) };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
