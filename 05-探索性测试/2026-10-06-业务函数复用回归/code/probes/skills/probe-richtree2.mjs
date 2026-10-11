// Probe: close any modal then open rich detail tree.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(400); }
  const dlgs = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].map(d => ({ shortcut: d.getAttribute('data-shortcut-modal'), text: (d.innerText || '').replace(/\s+/g, ' ').slice(0, 50) })));
  console.log('dialogs after esc:', JSON.stringify(dlgs));
  const frame = page.frames().find(f => f.url().includes('supcon-skills'));
  const card = frame.locator('section.panel [data-slot="card"]').filter({ has: frame.locator('.card-title h3', { hasText: 'fast-assert-rich-fn-20261006-agent2' }) }).first();
  await card.locator('[data-slot="card-content"]').first().click();
  await page.waitForTimeout(1800);
  const info = await frame.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const tree = document.querySelector('[class*="dir-tree"]');
    const nodes = tree ? [...tree.querySelectorAll('*')].filter(vis).filter(e => e.children.length === 0 && (e.innerText || '').trim()).map(e => ({ cls: (e.className || '').toString().split(' ')[0], text: (e.innerText || '').trim().slice(0, 30), tag: e.tagName })).slice(0, 30) : [];
    const preview = (document.querySelector('[class*="dir-preview"]') || {}).innerText || '';
    const top = (document.querySelector('[class*="page-top"]') || {}).innerText || '';
    return { nodes, top: top.replace(/\s+/g, ' ').slice(0, 80), preview: preview.replace(/\s+/g, ' ').slice(0, 200) };
  });
  console.log(JSON.stringify(info, null, 2));
} finally { await browser.close(); }
