// 软件操作支撑层：设置弹窗定位与交互原语。
import { connect } from './session.mjs';

export const SETTINGS_SEL = {
  dialog: '[data-shortcut-modal="settings"]',
  close: 'button[class*="_close"], [data-shortcut-modal="settings"] button:has-text("关闭")',
  navCell: 'button[class*="navCell"]',
  themeBtn: 'button[aria-pressed]',
  selector: 'button[class*="selector"]',
  fontInc: 'button[aria-label="增大字号"]',
  fontDec: 'button[aria-label="减小字号"]',
};

export async function openSettings(ctx) {
  const conn = await connect(ctx);
  const { page } = conn;
  if (!(await page.locator(SETTINGS_SEL.dialog).count())) {
    for (let i = 0; i < 2; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    await page.locator('button', { hasText: ctx.environment.account_name }).first().click();
    await page.waitForTimeout(800);
    await page.getByText(/^(设置|Settings)$/).first().click();
    await page.waitForTimeout(1500);
  }
  return conn;
}

export async function gotoTab(frame, page, name) {
  const aliases={'常规':'General','个人主页':'Profile','场景预设':'Scenario Presets','记忆与进化':'Memory & Evolution','实验性功能':'Experimental features','开发者模式':'Developer mode','内置插件':'Built-in plugins'};
  const dlg = frame.locator(SETTINGS_SEL.dialog);
  let cell = dlg.locator(SETTINGS_SEL.navCell).filter({ hasText: name });
  if(!await cell.count()&&aliases[name])cell=dlg.locator(SETTINGS_SEL.navCell).filter({hasText:aliases[name]});
  if (!(await cell.count()))throw Error('Settings category not found: '+name);
  await cell.first().click(); await page.waitForTimeout(1000);
}
