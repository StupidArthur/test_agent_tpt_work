// Probe: verify CDP connection and read current TPT Work surface.
// Source: docs 02-测试方法与技术参考/portable-agent-exe-ui-api-guide.md 第 2.4 节.
// This is a discovery probe, not a business function.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('F:/tpt-work-test/ui-by-agent/node_modules/playwright');

const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
try {
  const contexts = browser.contexts();
  const pages = contexts.flatMap(c => c.pages());
  console.log('targets:', JSON.stringify(await Promise.all(pages.map(async p => ({ title: await p.title(), url: p.url() }))), null, 2));
  const appPage = pages.find(p => p.url().startsWith('dsh-app://'));
  const loginPage = pages.find(p => p.url().includes('/renderer/welcome.html'));
  const page = appPage ?? loginPage;
  if (!page) throw new Error('no TPT Work page');
  console.log('selected:', await page.title(), page.url());
  const bodyText = await page.locator('body').innerText();
  console.log('--- body (first 3000) ---');
  console.log(bodyText.slice(0, 3000));
  console.log('--- visible dialogs:', await page.locator('[role="dialog"]:visible').count());
  const dlg = page.locator('[role="dialog"]:visible').first();
  if (await dlg.count()) console.log('dialog text:', (await dlg.innerText()).slice(0, 800));
  console.log('--- viewport:', JSON.stringify(page.viewportSize()));
} finally {
  await browser.close();
}
