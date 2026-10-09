import fs from 'node:fs';
import { connect, findMainPage, sleep } from '../automation/connect.mjs';
import { withApp, newTask, selectProject, typeAndSend, waitTerminal, sessionId, lastAssistantText, runningCount } from '../automation/tpt.mjs';

const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
const browser = await connect();
try {
  const page = findMainPage(browser);
  await sleep(300);
  const before = await page.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    return [...d.querySelectorAll('input[type="checkbox"]')].map((c) => c.checked);
  });
  console.log('before', JSON.stringify(before));
  await page.locator('[role="dialog"]:visible input[type="checkbox"]').first().click({ timeout: 8000, force: true }).catch((e) => console.log('click err', e.message));
  await sleep(1500);
  const after = await page.evaluate(() => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => e.offsetWidth);
    return [...d.querySelectorAll('input[type="checkbox"]')].map((c) => c.checked);
  });
  console.log('after', JSON.stringify(after));
} finally { await browser.close(); }

// now test a model request with memory toggled
await withApp(ctx, async (page) => {
  await newTask(page);
  await selectProject(page);
  await typeAndSend(page, '请只回复：G1PROBE_OK');
  const term = await waitTerminal(page, { timeout: 150000, expect: 'G1PROBE_OK' });
  console.log('ok=', term.ok, 'ms=', term.ms);
  console.log((await lastAssistantText(page)).slice(0, 500));
});
