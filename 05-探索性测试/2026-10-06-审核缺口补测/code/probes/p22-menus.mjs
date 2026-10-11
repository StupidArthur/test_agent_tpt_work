import { withApp, sleep, newTask, selectProject } from '../automation/tpt.mjs';
import fs from 'node:fs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await newTask(page);
  await selectProject(page);
  const composerBtns = await page.evaluate(() => {
    const bar = document.querySelector('[data-slot="conversation.input.dock"]') || document.querySelector('[data-slot="conversation.composer.bar"]');
    return bar ? [...bar.querySelectorAll('button')].map((b) => ({ aria: b.getAttribute('aria-label'), t: (b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 20), slot: b.getAttribute('data-slot') })).filter((b) => b.aria || b.t) : [];
  });
  console.log('COMPOSER BTNS', JSON.stringify(composerBtns, null, 2));
  // click + (create/plus) button
  const plus = page.locator('[aria-label="创建任务"], [aria-label="更多操作"], [aria-label*="新建"], button:has-text("+")').first();
  console.log('plus count', await plus.count());
  // find plus by slot
  const plusBtn = page.locator('[data-slot="conversation.input.left"] button').first();
  console.log('left button count', await page.locator('[data-slot="conversation.input.left"] button').count());
  await plusBtn.click({ timeout: 5000 }).catch((e) => console.log('plus click err', e.message));
  await sleep(800);
  const menu = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const m = [...document.querySelectorAll('[role="menu"]')].filter((e) => e.offsetWidth);
    return m.map((e) => ({ text: norm(e.innerText).slice(0, 400), items: [...e.querySelectorAll('[role="menuitem"]')].map((i) => norm(i.innerText)) }));
  });
  console.log('PLUS MENU', JSON.stringify(menu, null, 2));
  // close, then @
  await page.keyboard.press('Escape');
  await sleep(400);
  const composer = page.locator('[data-slot="conversation.input"] [contenteditable="true"], [contenteditable="true"]').first();
  await composer.click();
  await composer.type('@');
  await sleep(1200);
  const atMenu = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const m = [...document.querySelectorAll('[role="menu"],[role="listbox"],[class*="popover"]')].filter((e) => e.offsetWidth);
    return m.map((e) => ({ role: e.getAttribute('role'), cls: (e.className || '').toString().slice(0, 60), text: norm(e.innerText).slice(0, 500), items: [...e.querySelectorAll('[role="menuitem"],[role="option"]')].map((i) => norm(i.innerText).slice(0, 40)) }));
  });
  console.log('AT MENU', JSON.stringify(atMenu, null, 2));
  fs.writeFileSync('code/probes/p22-menus.json', JSON.stringify({ composerBtns, menu, atMenu }, null, 2), 'utf8');
  await composer.fill('').catch(() => {});
});
