import { withApp, dump, sleep, closeSettings } from './lib.mjs';
await withApp(async (page) => {
  await closeSettings(page);
  await page.getByRole('button', { name: '技能', exact: true }).first().click({ timeout: 8000 });
  await sleep(2500);
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    return {
      body: document.body.innerText.slice(0, 3000),
      dirInputs: [...document.querySelectorAll('input[type="file"]')].map(e => ({ webkitdirectory: e.hasAttribute('webkitdirectory'), multiple: e.multiple, accept: e.getAttribute('accept'), cls: (e.className||'').toString().slice(0,50) })),
      buttons: [...document.querySelectorAll('button')].filter(b => !b.closest('[class*="sessionRow"]')).map(b => ({ text: norm(b.innerText).slice(0, 24), aria: b.getAttribute('aria-label'), cls: (b.className || '').toString().slice(0, 40) })).filter(b => b.text || b.aria).slice(0, 60),
      frames: [...document.querySelectorAll('iframe')].map(f => f.src),
    };
  });
  await page.screenshot({ path: 'tools/run/scratch/skills-page.png' });
  dump('skills-page', st);
});
