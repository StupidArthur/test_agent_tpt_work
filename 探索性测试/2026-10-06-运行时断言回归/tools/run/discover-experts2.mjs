import { withApp, dump, sleep, expertsFrame } from './lib.mjs';
await withApp(async (page) => {
  const f = await expertsFrame(page);
  const st = await f.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    return {
      text: document.body.innerText.slice(0, 2000),
      inputs: [...document.querySelectorAll('input[type="file"]')].map(e => ({ webkitdirectory: e.hasAttribute('webkitdirectory'), multiple: e.multiple })),
      buttons: [...document.querySelectorAll('button,[role="button"],[role="tab"]')].map(b => ({ text: norm(b.innerText).slice(0, 24), aria: b.getAttribute('aria-label'), role: b.getAttribute('role') })).filter(b => b.text || b.aria).slice(0, 40),
    };
  });
  dump('experts-page', st);
});
