import { withApp, dump, sleep } from './lib.mjs';

await withApp(async (page, browser) => {
  await page.bringToFront().catch(() => {});
  const info = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="设置"]');
    const chain = [];
    let e = btn;
    while (e && chain.length < 8) {
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      chain.push({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 50), display: cs.display, visibility: cs.visibility, opacity: cs.opacity, overflow: cs.overflow, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } });
      e = e.parentElement;
    }
    const area = document.querySelector('.hHd-Xa_settingsArea');
    const foot = document.querySelector('.hHd-Xa_footArea');
    return { btn: chain, settingsAreaCls: area ? area.className : null, footExists: !!foot, bodyH: document.body.scrollHeight, winH: innerHeight, winW: innerWidth };
  });
  dump('settings-trigger-geom', info);
  // try clicking via coordinates of the trigger if it has area
  await page.keyboard.press('Control+Comma');
  await sleep(800);
  const dialogs = await page.locator('[role="dialog"]').evaluateAll(els => els.map(e => ({ visible: !!(e.offsetWidth || e.offsetHeight), text: (e.innerText || '').slice(0, 200) })));
  dump('settings-after-shortcut', { dialogs, url: page.url() });
});
