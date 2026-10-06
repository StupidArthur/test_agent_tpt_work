import { withApp, dump, sleep, openSettings } from './lib.mjs';

await withApp(async (page) => {
  await openSettings(page);
  const sections = ['常规', '个人主页', '积分与订阅', '场景预设', '记忆与进化', '实验性功能', '开发者模式', '内置插件'];
  const out = {};
  for (const s of sections) {
    const nav = page.locator('[role="dialog"]:visible button').filter({ hasText: new RegExp('^' + s) }).first();
    try { await nav.click({ timeout: 5000 }); } catch (e) { out[s] = 'NAV_ERR ' + e.message; continue; }
    await sleep(900);
    out[s] = await page.evaluate(() => {
      const dlg = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth && /设置/.test(e.innerText));
      return dlg ? dlg.innerText : null;
    });
  }
  dump('settings-sections', out);
});
