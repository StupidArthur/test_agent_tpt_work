import { withApp, dump, sleep } from './lib.mjs';
await withApp(async (page) => {
  const frame = page.frame({ url: /supcon-skills/ });
  if (!frame) { dump('skills-frame', { error: 'no frame' }); return; }
  await sleep(1500);
  const st = await frame.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    return {
      text: document.body.innerText.slice(0, 2500),
      inputs: [...document.querySelectorAll('input[type="file"]')].map(e => ({ webkitdirectory: e.hasAttribute('webkitdirectory'), multiple: e.multiple, accept: e.getAttribute('accept'), cls: (e.className || '').toString().slice(0, 50) })),
      buttons: [...document.querySelectorAll('button,[role="button"],[role="tab"]')].map(b => ({ text: norm(b.innerText).slice(0, 30), aria: b.getAttribute('aria-label'), role: b.getAttribute('role'), cls: (b.className || '').toString().slice(0, 40) })).filter(b => b.text || b.aria),
      switches: [...document.querySelectorAll('[role="switch"]')].slice(0, 10).map(s => ({ aria: s.getAttribute('aria-label'), checked: s.getAttribute('aria-checked') })),
    };
  });
  dump('skills-frame', st);
});
