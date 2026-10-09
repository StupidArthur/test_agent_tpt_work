import { withApp, dump, sleep, closeSettings, newTask, SEL } from './lib.mjs';
await withApp(async (page) => {
  await closeSettings(page);
  await newTask(page);
  const out = {};
  // + menu
  await page.locator('[aria-label="添加文件或调用指令"]').first().click({ timeout: 6000 }).catch(() => {});
  await sleep(900);
  out.plusMenu = await page.evaluate(() => { const m = [...document.querySelectorAll('[role="menu"],[role="listbox"],[class*="popover"],[class*="Popover"],[class*="menu"]')].find(e => e.offsetWidth && e.innerText.trim()); return m ? m.innerText.replace(/\s+/g, ' ') : null; });
  await page.keyboard.press('Escape'); await sleep(500);
  // @ menu
  const c = page.locator(SEL.composer).first();
  await c.click(); await page.keyboard.type('@'); await sleep(1000);
  out.atMenu = await page.evaluate(() => { const m = [...document.querySelectorAll('[role="listbox"],[role="menu"],[class*="popover"],[class*="Popover"]')].find(e => e.offsetWidth && e.innerText.trim()); return m ? m.innerText.replace(/\s+/g, ' ') : null; });
  await page.keyboard.press('Escape'); await c.fill('').catch(() => {});
  // sort menu
  await page.locator('[aria-label="排序方式"]').first().click({ timeout: 6000 }).catch(() => {});
  await sleep(800);
  out.sortMenu = await page.evaluate(() => { const m = [...document.querySelectorAll('[role="menu"],[role="listbox"]')].find(e => e.offsetWidth); return m ? m.innerText.replace(/\s+/g, ' ') : null; });
  out.sortItems = await page.evaluate(() => [...document.querySelectorAll('[role="menuitemradio"],[role="menuitem"],[role="radio"]')].filter(e => e.offsetWidth).map(e => ({ t: (e.innerText || '').trim(), checked: e.getAttribute('aria-checked') || e.getAttribute('data-state') })));
  await page.keyboard.press('Escape'); await sleep(400);
  dump('g13-probe', out);
});
