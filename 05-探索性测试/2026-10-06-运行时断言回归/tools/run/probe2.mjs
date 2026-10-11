import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));

const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
try {
  const pages = browser.contexts().flatMap(c => c.pages());
  const app = pages.find(p => p.url().startsWith('dsh-app://')) ?? pages[0];
  const buttons = await app.locator('button, [role="button"], [role="tab"], [role="menuitem"], [aria-haspopup]').evaluateAll(els => els.slice(0, 200).map(e => ({
    tag: e.tagName, role: e.getAttribute('role'), text: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 40),
    aria: e.getAttribute('aria-label'), expanded: e.getAttribute('aria-expanded'), checked: e.getAttribute('aria-checked'),
    cls: (e.className || '').toString().slice(0, 60),
  })));
  console.log('BUTTONS', JSON.stringify(buttons, null, 1));
  const inputs = await app.locator('input, textarea, [contenteditable="true"]').evaluateAll(els => els.slice(0, 100).map(e => ({
    tag: e.tagName, type: e.getAttribute('type'), ph: e.getAttribute('placeholder'), ce: e.getAttribute('contenteditable'),
    cls: (e.className || '').toString().slice(0, 60),
  })));
  console.log('INPUTS', JSON.stringify(inputs, null, 1));
} finally { await browser.close(); }
