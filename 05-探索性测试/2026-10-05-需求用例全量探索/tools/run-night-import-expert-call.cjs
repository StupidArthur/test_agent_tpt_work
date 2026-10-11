const fs = require('fs');
const { chromium } = require(process.env.TEMP + '/tpt-cdp/node_modules/playwright-core');

(async () => {
  const dir = '探索性测试/2026-10-05-需求用例全量探索/证据/AGENT-CREATE-20261006';
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
  const page = browser.contexts()[0].pages()[0];
  const frame = page.frames().find(f => f.url().includes('supcon-agents'));
  if (!frame) throw new Error('Expert manager iframe missing');
  const cards = frame.locator('div._card_c5z1c_2');
  const listing = await cards.evaluateAll(es => es.map((e, i) => ({ i, text: e.innerText.slice(0, 200), attrs: { ...e.dataset } })));
  fs.writeFileSync(`${dir}/expert-cards-before.json`, JSON.stringify(listing, null, 2), 'utf8');
  const target = cards.nth(0);
  await target.screenshot({ path: `${dir}/selected-card.png` });
  await target.getByText('使用', { exact: true }).click({ force: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/use-composer.png` });
  const editor = page.locator('[contenteditable=true][aria-label]').last();
  await editor.fill('请按照当前选中的本轮夜间导入专家的固定规则，原样返回该专家的唯一标记。仅返回标记，不要调用工具或执行任何操作。');
  await page.screenshot({ path: `${dir}/call-before-send.png` });
  await page.getByRole('button', { name: '发送消息' }).click();
  const start = Date.now();
  let tail = '';
  while (Date.now() - start < 90_000) {
    await page.waitForTimeout(1000);
    tail = (await page.locator('body').innerText()).slice(-5000);
    const disabled = await page.getByRole('button', { name: '发送消息' }).isDisabled().catch(() => true);
    if (!disabled && Date.now() - start > 5_000) break;
  }
  await page.screenshot({ path: `${dir}/call-result.png` });
  fs.writeFileSync(`${dir}/call-result.txt`, tail, 'utf8');
  const trace = page.getByRole('tab', { name: '轨迹', exact: true });
  if (await trace.count()) {
    await trace.click();
    await page.waitForTimeout(300);
    const traceText = (await page.locator('body').innerText()).slice(-6000);
    fs.writeFileSync(`${dir}/call-trace.txt`, traceText, 'utf8');
    await page.screenshot({ path: `${dir}/call-trace.png` });
    console.log(JSON.stringify({ elapsed_ms: Date.now() - start, result: tail.slice(-1800), trace: traceText.slice(-3000), listing: listing.slice(0, 5) }));
  } else console.log(JSON.stringify({ elapsed_ms: Date.now() - start, result: tail.slice(-1800), listing: listing.slice(0, 5) }));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
