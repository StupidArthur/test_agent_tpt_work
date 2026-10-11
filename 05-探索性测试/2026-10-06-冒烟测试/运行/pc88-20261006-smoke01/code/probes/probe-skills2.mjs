// Probe: skills iframe controls (toggle-aware).
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const skillsFrame = () => page.frames().find(f => f.url().includes('supcon-skills'));
async function openSkills() {
  let f = skillsFrame();
  if (f) return f;
  if (await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).count() === 0) {
    await page.getByRole('button', { name: '更多' }).click();
  }
  await page.locator('button.tpt-sidebar-action', { hasText: '技能' }).click();
  await page.waitForTimeout(2500);
  f = skillsFrame();
  if (!f) throw new Error('skills iframe not found after open');
  return f;
}
try {
  const sf = await openSkills();
  console.log('OPENED', sf.url());
  const btns = await sf.locator('button, [role=button], a').evaluateAll(els => els.filter(e => e.getClientRects().length).map(e => ({ tag: e.tagName, text: (e.innerText||'').trim().slice(0,26), aria: e.getAttribute('aria-label'), cls: String(e.className).slice(0,36) })).filter(x => x.text || x.aria));
  console.log('IFRAME_BUTTONS', JSON.stringify(btns, null, 2));
  const inputs = await sf.locator('input').evaluateAll(els => els.map(e => ({ type: e.type, accept: e.accept, placeholder: e.placeholder, cls: String(e.className).slice(0,36) })));
  console.log('IFRAME_INPUTS', JSON.stringify(inputs));
  console.log('TABS', JSON.stringify(await sf.locator('[role=tab]').allInnerTexts().catch(()=>[])));
} finally { await browser.close(); }
