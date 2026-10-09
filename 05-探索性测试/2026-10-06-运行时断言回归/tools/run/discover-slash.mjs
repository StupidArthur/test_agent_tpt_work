import { withApp, dump, sleep, closeSettings, newTask, SEL } from './lib.mjs';
await withApp(async (page) => {
  await closeSettings(page);
  await newTask(page);
  const composer = page.locator(SEL.composer).first();
  await composer.click();
  await page.keyboard.type('/');
  await sleep(1500);
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const menu = [...document.querySelectorAll('[role="listbox"],[role="menu"],[class*="command"],[class*="Command"],[class*="mention"],[class*="Mention"]')].filter(e => e.offsetWidth).map(e => norm(e.innerText).slice(0, 800));
    const opts = [...document.querySelectorAll('[role="option"],[role="menuitem"]')].filter(e => e.offsetWidth).map(e => norm(e.innerText).slice(0, 60));
    return { menu, opts: opts.slice(0, 30) };
  });
  dump('slash-probe', st);
});
