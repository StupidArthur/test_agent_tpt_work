// Probe: scene presets + language/permission dropdown options.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
try {
  const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
  const dlg = page.locator('[data-shortcut-modal="settings"]');
  // scene presets
  await dlg.getByRole('button', { name: '场景预设' }).click();
  await page.waitForTimeout(1200);
  const scene = await dlg.evaluate((d) => d.innerText.replace(/\s+/g, ' ').trim().slice(0, 500), null);
  console.log('SCENE:', scene);
  // back to general
  await dlg.getByRole('button', { name: '常规' }).click();
  await page.waitForTimeout(800);
  // language dropdown
  await dlg.locator('button[class*="selector"]').filter({ hasText: '中文' }).first().click();
  await page.waitForTimeout(800);
  const langOpts = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return [...document.querySelectorAll('[role="option"],[role="menuitem"],li,button')].filter(vis).map(e => (e.innerText || '').trim()).filter(t => t && t.length < 12 && /中文|English|英文/.test(t));
  });
  console.log('LANG OPTS:', JSON.stringify([...new Set(langOpts)]));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
} finally { await browser.close(); }
