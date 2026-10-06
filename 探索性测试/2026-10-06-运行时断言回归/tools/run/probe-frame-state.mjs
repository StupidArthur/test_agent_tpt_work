import { withApp, dump, sleep } from './lib.mjs';
await withApp(async (page) => {
  const frame = page.frame({ url: /supcon-skills/ });
  const st = await frame.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(e => e.offsetWidth);
    return {
      dialogs: dlg.map(d => d.innerText.slice(0, 600)),
      inputs: [...document.querySelectorAll('input[type="file"]')].map(e => ({ webkitdirectory: e.hasAttribute('webkitdirectory'), multiple: e.multiple, cls: (e.className || '').toString().slice(0, 40) })),
      buttons: [...document.querySelectorAll('button')].map(b => norm(b.innerText).slice(0, 24)).filter(Boolean).slice(0, 30),
    };
  });
  dump('skill-frame-state', st);
});
