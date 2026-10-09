import { withApp, dump, sleep } from './lib.mjs';
await withApp(async (page) => {
  const frame = page.frame({ url: /supcon-skills/ });
  const del = frame.getByRole('button', { name: '删除', exact: true }).first();
  await del.click({ timeout: 8000 });
  await sleep(1200);
  const st = await frame.evaluate(() => ({
    dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(e => e.offsetWidth).map(d => d.innerText.replace(/\s+/g, ' ').slice(0, 300)),
    buttons: [...document.querySelectorAll('[role="dialog"] button')].filter(e => e.offsetWidth).map(b => (b.innerText || '').trim()),
  }));
  console.log('WINDOWS BEFORE:', (await import('node:child_process')).execSync('powershell -NoProfile -Command "Get-Process tpt-work | Where-Object {$_.MainWindowTitle} | Select-Object -ExpandProperty MainWindowTitle"').toString());
  dump('delete-probe', st);
});
