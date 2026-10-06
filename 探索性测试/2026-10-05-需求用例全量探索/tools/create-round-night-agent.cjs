const fs = require('fs');
const { chromium } = require(process.env.TEMP + '/tpt-cdp/node_modules/playwright-core');

(async () => {
  const dir = '探索性测试/2026-10-05-需求用例全量探索/证据/AGENT-CREATE-20261006';
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
  const page = browser.contexts()[0].pages()[0];
  await page.screenshot({ path: `${dir}/composer-before.png` });
  const editor = page.locator('[contenteditable=true][aria-label]').first();
  const prompt = '/expert-manager 请创建一个本轮无害测试专家 round-night-created-expert-20261006，中文展示名“本轮夜间创建专家 20261006”。只负责在用户明确请求时原样回复 ROUND_NIGHT_CREATED_EXPERT_20261006_OK。专家说明与指令均明确禁止调用工具、访问文件、网络、连接器、设备、凭据或用户数据。请通过专家管理能力完成创建，并在回复中说明唯一名称和创建状态。';
  await editor.fill(prompt);
  await page.screenshot({ path: `${dir}/prompt-before-send.png` });
  await page.getByRole('button', { name: '发送消息' }).click();
  const start = Date.now();
  let last = '';
  while (Date.now() - start < 150_000) {
    await page.waitForTimeout(1000);
    last = (await page.locator('body').innerText()).slice(-6000);
    if (Date.now() - start > 10_000 && /已完成|已创建|错误|失败|新建专家/.test(last)) break;
  }
  await page.screenshot({ path: `${dir}/create-result.png` });
  fs.writeFileSync(`${dir}/create-result.txt`, last, 'utf8');
  console.log(JSON.stringify({ elapsed_ms: Date.now() - start, title: await page.title(), tail: last.slice(-3000), frames: page.frames().map(f => f.url()) }));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
