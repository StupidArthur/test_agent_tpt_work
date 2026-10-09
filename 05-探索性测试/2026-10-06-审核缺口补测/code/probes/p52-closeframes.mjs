import fs from 'node:fs';
import { withApp, sleep, expertsFrame, skillsFrame } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  for (const f of page.frames()) {
    if (!/supcon-/.test(f.url())) continue;
    for (let i = 0; i < 6; i++) {
      const has = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some((e) => e.offsetWidth)).catch(() => false);
      if (!has) break;
      const closed = await f.evaluate(() => {
        const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
        if (!d) return false;
        const btn = d.querySelector('button[aria-label="关闭"]') || [...d.querySelectorAll('button')].find((b) => /^(取消|关闭|×)$/.test((b.innerText || '').trim()));
        if (btn) { btn.click(); return true; }
        return false;
      }).catch(() => false);
      await sleep(600);
      if (!closed) { await page.keyboard.press('Escape').catch(() => {}); await sleep(500); }
    }
    const left = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.offsetWidth).length).catch(() => -1);
    console.log('frame', f.url(), 'dialogs left', left);
  }
});
