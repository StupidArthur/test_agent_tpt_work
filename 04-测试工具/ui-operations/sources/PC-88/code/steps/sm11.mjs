// Step: SM-11 theme change and restore.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
const OUT = 'D:\\code\\test_agent_tpt_work\\探索性测试\\2026-10-06-冒烟测试\\运行\\pc88-20261006-smoke01';
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TPT_CDP_PORT ?? 9234}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('dsh-app://'));
const readTarget = () => page.evaluate(() => {
  const bodies = [...document.querySelectorAll('[class*=body]')].filter(e=>e.getClientRects().length && e.querySelector('[class*=markdown]'));
  const el = bodies[bodies.length-1];
  if (!el) return null;
  const cs = getComputedStyle(el);
  const root = el.closest('[class*=root]') || el.parentElement;
  const cr = root ? getComputedStyle(root) : null;
  return { bodyColor: cs.color, bodyBg: cs.backgroundColor, rootColor: cr&&cr.color, rootBg: cr&&cr.backgroundColor };
});
const selectedTheme = () => page.evaluate(() => {
  const dlgs=[...document.querySelectorAll('[role=dialog]')].filter(e=>e.getClientRects().length); const d=dlgs[dlgs.length-1];
  if (!d) return null;
  const btns=[...d.querySelectorAll('button')].filter(e=>['浅色','深色','跟随系统'].includes((e.innerText||'').trim()));
  const sel = btns.find(b=>/selected/.test(String(b.className)));
  return sel ? sel.innerText.trim() : null;
});
async function openSettings(){ for(let i=0;i<4;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);} await page.locator('button', { hasText: 'Arthur' }).first().click(); await page.waitForTimeout(700); await page.getByText('设置', { exact: true }).click(); await page.waitForTimeout(1500); }
async function closeSettings(){ for(let i=0;i<4;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(200);} }
async function clickTheme(name){ const dlg=page.locator('[role=dialog]:visible').last(); await dlg.locator('button', { hasText: name }).first().click(); await page.waitForTimeout(1500); }
try {
  for(let i=0;i<4;i++){ await page.keyboard.press('Escape'); await page.waitForTimeout(250);}
  // ensure on SM-03 session
  const row = page.locator('text=只回复：SMOKE_CHAT_pc88').first();
  if (await row.count()) { await row.click(); await page.waitForTimeout(2000); }
  await openSettings();
  const themeInitial = await selectedTheme();
  const S0 = await readTarget();
  // choose opposite explicit theme. Resolve current: from target color darkness is unreliable; use explicit choice list.
  const currentIsLight = S0 && /rgb\((1[0-9]|[0-9]),/.test(S0.bodyColor) && parseInt((S0.bodyColor.match(/\d+/)||[255])[0]) < 128;
  const themeChanged = currentIsLight ? '深色' : '浅色';
  await clickTheme(themeChanged);
  const E1 = await selectedTheme();
  const S1 = await readTarget();
  // restore
  await clickTheme(themeInitial);
  await page.waitForTimeout(800);
  const S2 = await readTarget();
  await closeSettings();
  await openSettings();
  const E2 = await selectedTheme();
  const S2b = await readTarget();
  await closeSettings();
  const changed = S0 && S1 && (S0.bodyColor !== S1.bodyColor || S0.bodyBg !== S1.bodyBg || S0.rootColor !== S1.rootColor || S0.rootBg !== S1.rootBg);
  const restored = S0 && S2b && (S0.bodyColor === S2b.bodyColor) && (S0.bodyBg === S2b.bodyBg);
  const result = {
    id:'SM-11', contract_version:'smoke-1.0', machine_id:'PC-88',
    assertions:{
      'SM-11-A1':{ read:'readback appearance option equals chosen', chosen:themeChanged, actual:E1, expected:themeChanged, pass: E1 === themeChanged },
      'SM-11-A2':{ read:'computed color/background changed', S0, S1, changed:!!changed, expected:true, pass: !!changed },
      'SM-11-A3':{ read:'reopen appearance option', initial:themeInitial, actual:E2, expected:themeInitial, pass: E2 === themeInitial },
      'SM-11-A4':{ read:'assistant body computed color restored', S0, restored:S2b, pass: !!restored },
    },
    raw:{ S2 },
  };
  fs.writeFileSync(path.join(OUT,'结果','SM-11.json'), JSON.stringify(result,null,2));
  console.log(JSON.stringify(result.assertions, null, 2));
} finally { await browser.close(); }
