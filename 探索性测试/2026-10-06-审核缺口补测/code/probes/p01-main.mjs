import { connect, allPages, findMainPage, frameInfos, sleep } from '../automation/connect.mjs';

const browser = await connect();
try {
  const pages = allPages(browser);
  console.log('PAGES:', JSON.stringify(await Promise.all(pages.map(async (p) => ({ title: await p.title(), url: p.url() }))), null, 2));
  const page = findMainPage(browser);
  if (!page) throw new Error('no main page');
  console.log('MAIN:', await page.title(), page.url());
  console.log('FRAMES:', JSON.stringify(await frameInfos(page), null, 2));
  const dialogs = page.locator('[role="dialog"]:visible');
  console.log('DIALOGS:', await dialogs.count());
  for (let i = 0; i < await dialogs.count(); i++) {
    console.log('  dialog', i, (await dialogs.nth(i).innerText()).slice(0, 300));
  }
  const body = await page.locator('body').innerText();
  console.log('BODY_START');
  console.log(body.slice(0, 3000));
  console.log('BODY_END len=', body.length);
  await page.screenshot({ path: 'code/probes/main-state.png' });
} finally {
  await browser.close();
}
