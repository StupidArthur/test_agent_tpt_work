// Probe: import dialog for skills.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const frame = page.frames().find(f => f.url().includes('supcon-skills'));
  await frame.getByRole('button', { name: '导入技能' }).click();
  await page.waitForTimeout(1500);
  const dump = await frame.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(vis).map(d => (d.innerText || '').trim().slice(0, 600));
    const inputs = [...document.querySelectorAll('input')].filter(vis).map(i => ({ type: i.getAttribute('type'), accept: i.getAttribute('accept'), aria: i.getAttribute('aria-label'), multiple: i.multiple }));
    const btns = [...document.querySelectorAll('button')].filter(vis).map(b => (b.innerText || '').trim().slice(0, 20)).filter(Boolean);
    return { dialogs, inputs, btns };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
