import { withApp, dump, sleep, closeSettings } from './lib.mjs';
await withApp(async (page) => {
  await closeSettings(page);
  await page.getByRole('button', { name: '专家', exact: true }).first().click({ timeout: 8000 });
  await sleep(2500);
  const st = await page.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    return { frames: [...document.querySelectorAll('iframe')].map(f => f.src), body: norm(document.body.innerText).slice(0, 300) };
  });
  dump('experts-frames', st);
});
