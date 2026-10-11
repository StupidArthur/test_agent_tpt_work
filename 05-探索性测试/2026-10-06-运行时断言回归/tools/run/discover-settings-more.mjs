import { withApp, dump, sleep, openSettings, openSettingsSection } from './lib.mjs';
await withApp(async (page) => {
  await openSettings(page);
  const out = {};
  const menu = () => page.evaluate(() => { const m = [...document.querySelectorAll('[role="menu"],[role="listbox"]')].find(e => e.offsetWidth); return m ? m.innerText.replace(/\s+/g, ' ') : null; });
  // work steps selector
  const ws = page.locator('button[class*="_2XZxNq_selector"]').first();
  await ws.click({ timeout: 5000 }).catch(() => {}); await sleep(700); out.workStepsMenu = await menu(); await page.keyboard.press('Escape'); await sleep(400);
  // usage selector (second _2XZxNq_selector)
  const us = page.locator('button[class*="_2XZxNq_selector"]').nth(1);
  await us.click({ timeout: 5000 }).catch(() => {}); await sleep(700); out.usageMenu = await menu(); await page.keyboard.press('Escape'); await sleep(400);
  // link selector (third)
  const ls = page.locator('button[class*="_2XZxNq_selector"]').nth(2);
  await ls.click({ timeout: 5000 }).catch(() => {}); await sleep(700); out.linkMenu = await menu(); await page.keyboard.press('Escape'); await sleep(400);
  // shortcuts editor
  await page.getByRole('button', { name: '编辑快捷键' }).click({ timeout: 5000 }).catch(() => {}); await sleep(1200);
  out.shortcutDialog = await page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth && /快捷键/.test(e.innerText)); return d ? d.innerText.replace(/\s+/g, ' ').slice(0, 800) : null; });
  out.shortcutInputs = await page.evaluate(() => [...document.querySelectorAll('input,button')].filter(e => e.offsetWidth && /新建|搜索|F9|Ctrl/.test(e.innerText || e.value || '')).map(e => ({ tag: e.tagName, t: (e.innerText || e.value || '').slice(0, 30), aria: e.getAttribute('aria-label') })).slice(0, 20));
  await page.keyboard.press('Escape'); await sleep(600);
  // personal profile
  await openSettingsSection(page, '个人主页');
  out.profile = await page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); const inputs = [...d.querySelectorAll('input,textarea,[contenteditable="true"]')].map(e => ({ tag: e.tagName, value: e.value, disabled: e.disabled, readonly: e.readOnly })); return { text: d.innerText.replace(/\s+/g, ' ').slice(0, 400), inputs }; });
  dump('settings-more', out);
});
