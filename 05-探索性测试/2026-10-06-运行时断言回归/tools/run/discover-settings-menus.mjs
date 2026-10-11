import { withApp, dump, sleep, openSettings, openSettingsSection } from './lib.mjs';
await withApp(async (page) => {
  await openSettings(page);
  const out = {};
  const dlgText = () => page.locator('[role="dialog"]:visible').first().innerText().catch(() => '');
  // language selector
  const lang = page.locator('button[class*="hVGvvW_selector"]').first();
  await lang.click({ timeout: 6000 }).catch(e => out.langErr = e.message);
  await sleep(800);
  out.langMenu = await page.evaluate(() => [...document.querySelectorAll('[role="menu"],[role="listbox"],[role="dialog"]')].filter(e => e.offsetWidth).map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 200)));
  await page.keyboard.press('Escape'); await sleep(400);
  // permission selector
  const perm = page.locator('button[class*="oY77xG_selector"]').first();
  await perm.click({ timeout: 6000 }).catch(e => out.permErr = e.message);
  await sleep(800);
  out.permMenu = await page.evaluate(() => [...document.querySelectorAll('[role="menu"],[role="listbox"]')].filter(e => e.offsetWidth).map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 200)));
  await page.keyboard.press('Escape'); await sleep(400);
  // font arrows
  const inc = page.locator('button[aria-label="增大字号"]').first();
  await inc.click({ timeout: 6000 }).catch(e => out.incErr = e.message);
  await sleep(800);
  out.fontAfterInc = (await dlgText()).match(/字号大小[\s\S]*?\n(\d{1,2})\s*\n?px/)?.[1] ?? null;
  const dec = page.locator('button[aria-label="减小字号"]').first();
  await dec.click({ timeout: 6000 }).catch(() => {});
  await sleep(600);
  // scene section
  await openSettingsSection(page, '场景预设');
  out.sceneText = await dlgText();
  await page.keyboard.press('Escape');
  dump('settings-menus', out);
});
