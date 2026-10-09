// Probe: composer add-file flow and attachment area.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  for (let i = 0; i < 2; i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
  const addBtn = page.locator('button[aria-label="添加文件或调用指令"]').first();
  await addBtn.click();
  await page.waitForTimeout(1200);
  const dump = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const menus = [...document.querySelectorAll('[role="menu"],[role="dialog"],[data-radix-popper-content-wrapper]')].filter(vis).map(m => (m.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200));
    const fileInputs = [...document.querySelectorAll('input[type="file"]')].map(i => ({ accept: i.getAttribute('accept'), multiple: i.multiple, dir: i.getAttribute('webkitdirectory'), cls: (i.className||'').toString().slice(0,40) }));
    const slots = [...new Set([...document.querySelectorAll('[data-slot]')].map(e => e.getAttribute('data-slot')))].filter(s => /attach|file|input/i.test(s));
    return { menus, fileInputs, slots };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
