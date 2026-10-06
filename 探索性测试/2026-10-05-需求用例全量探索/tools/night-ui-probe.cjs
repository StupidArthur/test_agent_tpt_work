const { chromium } = require(process.env.TEMP + '/tpt-cdp/node_modules/playwright-core');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
  const context = browser.contexts()[0];
  for (const page of context.pages()) {
    console.log('PAGE', page.url(), await page.title().catch(() => ''));
    for (const frame of page.frames()) {
      console.log('FRAME', frame.url(), (await frame.locator('body').innerText().catch(e => String(e))).slice(0, 2400));
      if (frame.url().includes('supcon-skills')) {
        console.log('CARDS', await frame.getByText('本轮技能样本 20261006', { exact: true }).count());
        console.log('BUTTONS', await frame.locator('button').allTextContents());
        console.log('INPUTS', await frame.locator('input').evaluateAll(xs => xs.map(x => ({ type:x.type,accept:x.accept,visible:!!(x.offsetWidth||x.offsetHeight||x.getClientRects().length) }))));
      }
    }
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
