// Probe: expert import dialog.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const frame = page.frames().find(f => f.url().includes('supcon-agents'));
  await frame.getByRole('button', { name: '导入专家' }).click();
  await page.waitForTimeout(1500);
  const dump = await frame.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const dlg = document.querySelector('[role="dialog"]');
    const inputs = [...document.querySelectorAll('input[type="file"]')].map(i => ({ accept: i.getAttribute('accept'), multiple: i.multiple, dir: i.getAttribute('webkitdirectory'), outer: i.outerHTML.slice(0, 160) }));
    return { dialogText: dlg ? dlg.innerText.slice(0, 500) : null, inputs };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
