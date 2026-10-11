// Probe: hover/click "更多" then dump any popover portal content.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const dumpNewText = async (label, before) => {
  const body = await page.locator('body').innerText();
  const added = body.replace(before, '');
  console.log(`== ${label} added-text:`, JSON.stringify(added.slice(0, 600)));
};
try {
  const before = await page.locator('body').innerText();
  await page.getByRole('button', { name: '更多' }).hover();
  await page.waitForTimeout(900);
  await dumpNewText('hover 更多', before);
  await page.getByRole('button', { name: '更多' }).click();
  await page.waitForTimeout(300);
  await dumpNewText('click 更多 (immediate)', before);
  await page.waitForTimeout(900);
  await dumpNewText('click 更多 (+0.9s)', before);
  // dump any positioned popover elements
  const pop = await page.evaluate(() => {
    const els = [...document.querySelectorAll('div,ul')].filter(e => {
      const s = getComputedStyle(e);
      return (s.position === 'absolute' || s.position === 'fixed') && s.visibility !== 'hidden' && s.display !== 'none' && e.getClientRects().length && e.innerText && e.innerText.trim().length < 400;
    });
    return els.slice(0, 8).map(e => ({ cls: e.className && String(e.className).slice(0,60), text: e.innerText.trim().slice(0,200) }));
  });
  console.log('POPOVERS', JSON.stringify(pop, null, 2));
} finally {
  await browser.close();
}
