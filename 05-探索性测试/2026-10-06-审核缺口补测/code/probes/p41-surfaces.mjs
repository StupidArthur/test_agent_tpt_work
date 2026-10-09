import fs from 'node:fs';
import { withApp, sleep, expertsFrame, skillsFrame } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  const out = {};
  const ef = await expertsFrame(page);
  out.expertButtons = await ef.evaluate(() => [...document.querySelectorAll('button')].map((b) => (b.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30));
  const sf = await skillsFrame(page);
  out.skillButtons = await sf.evaluate(() => [...document.querySelectorAll('button')].map((b) => (b.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30));
  // automation page
  await page.getByRole('button', { name: '自动化任务', exact: true }).first().click({ timeout: 6000 }).catch((e) => out.automationErr = e.message);
  await sleep(2500);
  out.automation = await page.evaluate(() => ({ url: location.href, text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 800) }));
  // account menu
  await page.locator('[data-slot="settings.user"] button[aria-haspopup="menu"]').first().click({ timeout: 6000 }).catch(() => {});
  await sleep(700);
  out.accountMenu = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].map((m) => m.innerText.replace(/\s+/g, ' ').trim()));
  await page.keyboard.press('Escape');
  console.log(JSON.stringify(out, null, 2));
  fs.writeFileSync('code/probes/p41-surfaces.json', JSON.stringify(out, null, 2), 'utf8');
});
