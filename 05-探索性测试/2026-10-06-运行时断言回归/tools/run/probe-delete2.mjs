import { withApp, dump, sleep } from './lib.mjs';
await withApp(async (page) => {
  const frame = page.frame({ url: /supcon-skills/ });
  const top = frame.locator('header[class*="_page-top_"]').first();
  const del = top.getByRole('button', { name: '删除', exact: true }).first();
  await del.click({ timeout: 8000 });
  await sleep(1200);
  const st = await frame.evaluate(() => ({
    dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(e => e.offsetWidth).map(d => d.innerText.replace(/\s+/g, ' ').slice(0, 300)),
    popovers: [...document.querySelectorAll('[data-radix-popper-content-wrapper], [role="alertdialog"]')].filter(e => e.offsetWidth).map(d => d.innerText.replace(/\s+/g, ' ').slice(0, 200)),
    buttons: [...document.querySelectorAll('button')].filter(b => b.offsetWidth && /确认|取消|删除/.test(b.innerText)).map(b => b.innerText.trim()),
  }));
  dump('delete-probe2', st);
});
