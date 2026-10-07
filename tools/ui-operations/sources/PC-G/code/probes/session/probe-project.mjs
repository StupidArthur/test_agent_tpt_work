// Probe: open project selector and read options.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  await page.locator('button[aria-label="选择项目"]').click();
  await page.waitForTimeout(1500);
  const dump = await page.evaluate(() => {
    const vis = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const out = [];
    for (const el of document.querySelectorAll('[role="dialog"],[role="menu"],[role="listbox"],[data-radix-popper-content-wrapper]')) {
      if (!vis(el)) continue;
      out.push({ role: el.getAttribute('role'), text: (el.innerText || '').trim().slice(0, 1500), items: [...el.querySelectorAll('[role="menuitem"],[role="option"],button,li,[role="listitem"]')].filter(vis).map(i => (i.innerText || '').trim().slice(0, 80)).filter(Boolean) });
    }
    return out;
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
