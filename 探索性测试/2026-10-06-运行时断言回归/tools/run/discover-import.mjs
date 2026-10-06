import { withApp, dump, sleep } from './lib.mjs';
await withApp(async (page) => {
  const frame = page.frame({ url: /supcon-skills/ });
  await frame.getByRole('button', { name: '导入技能', exact: true }).click({ timeout: 8000 });
  await sleep(1500);
  const st = await frame.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth) || document.body;
    return {
      text: dlg.innerText.slice(0, 1200),
      inputs: [...document.querySelectorAll('input[type="file"]')].map(e => ({ webkitdirectory: e.hasAttribute('webkitdirectory'), multiple: e.multiple, accept: e.getAttribute('accept'), cls: (e.className || '').toString().slice(0, 40) })),
      buttons: [...dlg.querySelectorAll('button')].map(b => ({ text: norm(b.innerText).slice(0, 24), aria: b.getAttribute('aria-label') })).filter(b => b.text || b.aria),
    };
  });
  dump('skill-import-dialog', st);
});
