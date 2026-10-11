import { withApp, dump, sleep, closeSettings, newTask, SEL } from './lib.mjs';
await withApp(async (page) => {
  await closeSettings(page);
  await newTask(page);
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    return {
      fileInputs: [...document.querySelectorAll('input[type="file"]')].map(e => ({ multiple: e.multiple, accept: e.getAttribute('accept'), cls: (e.className || '').toString().slice(0, 40) })),
      attachButtons: [...document.querySelectorAll('button')].filter(b => /附件|上传|添加|attach|paperclip|clip/i.test(b.getAttribute('aria-label') || b.title || b.innerText || '')).map(b => ({ aria: b.getAttribute('aria-label'), title: b.title, cls: (b.className || '').toString().slice(0, 40) })),
      composerButtons: [...document.querySelectorAll('[class*="uV2eYG"] button, [class*="composer"] button')].map(b => ({ aria: b.getAttribute('aria-label'), title: b.title, cls: (b.className || '').toString().slice(0, 40) })),
    };
  });
  dump('attach-probe', st);
});
