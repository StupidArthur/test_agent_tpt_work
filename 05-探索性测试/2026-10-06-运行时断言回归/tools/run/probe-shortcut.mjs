import { withApp, dump, sleep, openSettings } from './lib.mjs';
await withApp(async (page) => {
  await openSettings(page);
  await page.getByRole('button', { name: '编辑快捷键' }).first().click({ timeout: 6000 }).catch(() => {});
  await sleep(1500);
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const panels = [...document.querySelectorAll('[role="dialog"],[class*="panel"],[class*="Panel"]')].filter(e => e.offsetWidth).map(e => ({ cls: (e.className || '').toString().slice(0, 40), text: norm(e.innerText).slice(0, 600) }));
    const buttons = [...document.querySelectorAll('button')].filter(b => b.offsetWidth && /新建|搜索|快捷键|录制|重置|F9|Ctrl/.test(b.innerText || b.getAttribute('aria-label') || '')).map(b => ({ t: norm(b.innerText).slice(0, 30), aria: b.getAttribute('aria-label') }));
    return { panels, buttons };
  });
  dump('shortcut-editor', st);
});
