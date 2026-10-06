import path from 'node:path';
import { withApp, dump, sleep, fixtureRoot } from './lib.mjs';
await withApp(async (page) => {
  const frame = page.frame({ url: /supcon-skills/ });
  const single = frame.locator('input[type="file"]').first();
  await single.setInputFiles(path.join(fixtureRoot, 'skill-import', 'SKILL.md'));
  await sleep(800);
  const afterSelect = await frame.evaluate(() => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth);
    return dlg ? dlg.innerText.replace(/\s+/g, ' ').slice(0, 400) : null;
  });
  await frame.getByRole('button', { name: '导入', exact: true }).click({ timeout: 8000 });
  await sleep(2500);
  const state = await frame.evaluate(() => {
    const norm = s => (s || '').trim().replace(/\s+/g, ' ');
    return {
      dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(e => e.offsetWidth).map(d => norm(d.innerText).slice(0, 300)),
      myMatch: norm(document.body.innerText).includes('fast-assert-skill-20261006-oc1'),
      body: document.body.innerText.slice(0, 1200),
    };
  });
  dump('skill-import-result', { afterSelect, state });
});
