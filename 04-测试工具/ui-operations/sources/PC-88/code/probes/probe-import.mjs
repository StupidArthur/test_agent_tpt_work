// Probe: skills iframe import dialog + card structure.
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
  if (!f) throw new Error('skills iframe not found');
  return f;
}
try {
  const sf = await openSkills();
  // card structure
  const cards = await sf.evaluate(() => {
    const out = [];
    const els = [...document.querySelectorAll('*')].filter(e => /来源/.test(e.textContent||'') && e.children.length);
    return els.slice(0,3).map(e => ({ tag: e.tagName, cls: String(e.className).slice(0,50), text: e.innerText.slice(0,80) }));
  });
  console.log('CARDISH', JSON.stringify(cards, null, 2));
  // open import dialog
  await sf.getByRole('button', { name: '导入技能' }).click();
  await page.waitForTimeout(900);
  const btns = await sf.locator('button, [role=button]').evaluateAll(els => els.filter(e => e.getClientRects().length).map(e => ({ text: (e.innerText||'').trim().slice(0,24), cls: String(e.className).slice(0,30) })).filter(x=>x.text));
  console.log('DIALOG_BUTTONS', JSON.stringify(btns));
  const inputs = await sf.locator('input, [role=dialog] input').evaluateAll(els => els.map(e => ({ type: e.type, accept: e.accept, cls: String(e.className).slice(0,30) })));
  console.log('DIALOG_INPUTS', JSON.stringify(inputs));
  const dialogs = await sf.locator('[role=dialog]:visible').allInnerTexts().catch(()=>[]);
  console.log('DIALOGS', JSON.stringify(dialogs));
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  console.log('AFTER_ESC dialogs', await sf.locator('[role=dialog]:visible').count());
} finally { await browser.close(); }
