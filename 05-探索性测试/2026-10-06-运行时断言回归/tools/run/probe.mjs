import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));

const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
try {
  const contexts = browser.contexts();
  const pages = contexts.flatMap(c => c.pages());
  console.log('CONTEXTS', contexts.length, 'PAGES', pages.length);
  for (const p of pages) {
    console.log('PAGE', JSON.stringify({ title: await p.title(), url: p.url() }));
  }
  const app = pages.find(p => p.url().startsWith('dsh-app://')) ?? pages[0];
  console.log('SELECTED', app.url());
  const bodyText = await app.locator('body').innerText().catch(e => 'ERR ' + e.message);
  console.log('---BODY START---');
  console.log(bodyText.slice(0, 4000));
  console.log('---BODY END---');
  const frames = app.frames().map(f => f.url());
  console.log('FRAMES', JSON.stringify(frames, null, 2));
  console.log('DIALOGS visible', await app.locator('[role="dialog"]:visible').count());
} finally {
  await browser.close();
}
