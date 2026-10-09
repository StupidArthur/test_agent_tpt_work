const fs = require('fs');
const { chromium } = require('C:/Users/Administrator/AppData/Local/Temp/tpt-cdp/node_modules/playwright-core');
(async () => {
  const dir = '探索性测试/2026-10-05-需求用例全量探索/证据/SETTINGS-NIGHT-20261006';
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
  const page = browser.contexts()[0].pages()[0];
  const panel = page.locator('[role="dialog"].VOzbGW_panel');
  const snap = async () => {
    const selected = await panel.locator('button._8HJdBW_themeCube[aria-pressed="true"]').innerText();
    const colors = await panel.evaluate(el => {
      const s = getComputedStyle(el);
      return { panel: s.backgroundColor, color: s.color, htmlClass: document.documentElement.className, bodyClass: document.body.className };
    });
    return { selected, colors };
  };
  const before = await snap();
  await panel.getByRole('button', { name: '深色', exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('button._8HJdBW_themeCube')].some(e => e.innerText === '深色' && e.getAttribute('aria-pressed') === 'true' && e.offsetWidth > 0));
  await page.waitForTimeout(300);
  const changed = await snap();
  await panel.getByRole('button', { name: '跟随系统', exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('button._8HJdBW_themeCube')].some(e => e.innerText === '跟随系统' && e.getAttribute('aria-pressed') === 'true' && e.offsetWidth > 0));
  await page.waitForTimeout(300);
  const restored = await snap();
  const result = { setting: '外观主题', captured_at: new Date().toISOString(), before, changed, restored, prior_light_selection_probe: '切换到浅色时选中态变化，但body背景仍为rgb(255,255,255)，该观察单独不能证明颜色效果。', actions: ['由原跟随系统切至深色并读取选择与样式', '恢复跟随系统并回读选择与样式'], conclusion: '判断以三阶段实测数据为准；仅凭选中态不推断视觉变化。' };
  fs.writeFileSync(dir + '/theme-cycle.json', JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify(result));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
