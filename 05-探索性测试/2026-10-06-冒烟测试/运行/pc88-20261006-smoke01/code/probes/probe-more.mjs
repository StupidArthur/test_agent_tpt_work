// Probe: click "更多" and dump resulting surface.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
try {
  await page.getByRole('button', { name: '更多' }).click();
  await page.waitForTimeout(1200);
  console.log('URL', page.url());
  console.log('FRAMES', page.frames().map(f => f.url()));
  const body = await page.locator('body').innerText();
  console.log('BODY_START');
  console.log(body.slice(0, 3000));
  console.log('BODY_END');
  const roles = await page.evaluate(() => {
    const out = {};
    for (const el of document.querySelectorAll('[role]')) {
      const r = el.getAttribute('role');
      const vis = el.offsetParent !== null || (el.getClientRects && el.getClientRects().length);
      if (vis) out[r] = (out[r] || 0) + 1;
    }
    return out;
  });
  console.log('VISIBLE_ROLES', JSON.stringify(roles));
  const btns = await page.locator('button:visible').evaluateAll(els => els.map(e => (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 50)).filter(Boolean));
  console.log('BUTTONS', JSON.stringify(btns));
} finally {
  await browser.close();
}
