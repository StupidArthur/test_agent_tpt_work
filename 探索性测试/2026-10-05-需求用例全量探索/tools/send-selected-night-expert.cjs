const fs = require('fs');
const { chromium } = require(process.env.TEMP + '/tpt-cdp/node_modules/playwright-core');
(async () => {
  const dir = '探索性测试/2026-10-05-需求用例全量探索/证据/AGENT-CREATE-20261006';
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
  const page = browser.contexts()[0].pages()[0];
  await page.setViewportSize({ width: 1100, height: 800 });
  const editor = page.locator('[contenteditable=true]:visible').first();
  const initial = await editor.evaluate(e => ({ text: e.innerText, html: e.innerHTML }));
  if (!initial.html.includes('agent-night-agent-complete-20261006')) throw new Error('Expected round-owned Expert chip missing');
  await editor.click();
  await editor.press('End');
  await editor.press('Enter');
  await page.keyboard.type('请按当前选中的本轮夜间导入专家固定规则，原样返回该专家的唯一标记。仅返回标记，不要调用工具或执行任何操作。');
  await page.screenshot({ path: `${dir}/call-before-send.png` });
  const visibleText = await editor.innerText();
  await page.getByRole('button', { name: '发送消息' }).click();
  const start = Date.now();
  let body = '';
  let completed = false;
  while (Date.now() - start < 90_000) {
    await page.waitForTimeout(750);
    body = await page.locator('body').innerText();
    const hasMarker = body.includes('NIGHT_AGENT_IMPORT_OK_20261006');
    const running = /探索中|正在思考|正在运行命令|生成中/.test(body.slice(-700));
    if (hasMarker && !running) { completed = true; break; }
  }
  await page.getByRole('tab', { name: '对话', exact: true }).click().catch(() => {});
  await page.screenshot({ path: `${dir}/call-result.png` });
  body = await page.locator('body').innerText();
  fs.writeFileSync(`${dir}/call-result.txt`, body.slice(-8000), 'utf8');
  const traceTab = page.getByRole('tab', { name: '轨迹', exact: true });
  let trace = '';
  if (await traceTab.count()) {
    await traceTab.click(); await page.waitForTimeout(250);
    trace = (await page.locator('body').innerText()).slice(-8000);
    await page.screenshot({ path: `${dir}/call-trace.png` });
    fs.writeFileSync(`${dir}/call-trace.txt`, trace, 'utf8');
  }
  fs.writeFileSync(`${dir}/call-result.json`, JSON.stringify({ captured_at: new Date().toISOString(), prefill: initial, submitted_text: visibleText, elapsed_ms: Date.now() - start, completed, marker_seen: body.includes('NIGHT_AGENT_IMPORT_OK_20261006'), selected_agent_seen_in_trace: trace.includes('agent-night-agent-complete-20261006'), trace_excerpt: trace.slice(-3500) }, null, 2), 'utf8');
  console.log(JSON.stringify({ completed, marker_seen: body.includes('NIGHT_AGENT_IMPORT_OK_20261006'), elapsed_ms: Date.now() - start, result: body.slice(-2200), trace: trace.slice(-3000) }));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
