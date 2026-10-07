// Probe: find hidden file inputs in import dialog.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const frame = page.frames().find(f => f.url().includes('supcon-skills'));
  const dump = await frame.evaluate(() => {
    const all = [...document.querySelectorAll('input[type="file"]')].map(i => ({ accept: i.getAttribute('accept'), multiple: i.multiple, hidden: i.hidden, style: i.getAttribute('style'), outer: i.outerHTML.slice(0, 200), parentTag: i.parentElement?.tagName, parentText: (i.parentElement?.innerText || '').trim().slice(0, 30) }));
    const dlg = document.querySelector('[role="dialog"]');
    return { fileInputs: all, dialogHtml: dlg ? dlg.outerHTML.slice(0, 2500) : null };
  });
  console.log(JSON.stringify(dump, null, 2));
} finally { await browser.close(); }
