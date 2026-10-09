const fs = require('fs');
const { chromium } = require(process.env.TEMP + '/tpt-cdp/node_modules/playwright-core');
(async () => {
  const dir = '探索性测试/2026-10-05-需求用例全量探索/证据/DIALOG-012-NIGHT-20261006';
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
  const page = browser.contexts()[0].pages()[0];
  await page.setViewportSize({ width: 1100, height: 800 });
  const bodyPre = (await page.locator('body').innerText()).slice(-550);
  const permission = await page.getByRole('button', { name: /访问模式/ }).getAttribute('aria-label');
  const model = await page.getByRole('button', { name: /选择模型/ }).getAttribute('aria-label');
  const pathInput = await page.locator('input[type=file]').first().evaluate(e => ({ type: e.type, multiple: e.multiple, files: [...e.files].map(f => ({ name: f.name, size: f.size, type: f.type })) }));
  const prompt = 'This is DIALOG-012 read-only attachment-path probe. Do not open or read the attached file, and do not call tools. Based only on the UI attachment metadata, reply exactly DIALOG012_METADATA_ONLY_OK. Do not infer or reveal any file body. No external actions.';
  await page.locator('[contenteditable=true]:visible').first().fill(prompt);
  await page.screenshot({ path: `${dir}/prompt-before-send.png` });
  if (!permission.includes('仅可查看') || !model.includes('标准') || !model.includes('low')) throw new Error(JSON.stringify({ permission, model }));
  const attachmentControl = await page.getByRole('button', { name: '移除文件 fixture-one.txt', exact: true }).count();
  if (!bodyPre.includes('fixture-one.txt') || !bodyPre.includes('TXT 21B') || attachmentControl !== 1) throw new Error(`Visible attachment card missing: ${JSON.stringify({ bodyPre, attachmentControl, pathInput })}`);
  await page.getByRole('button', { name: '发送消息' }).click();
  const start = Date.now(); let body = '';
  while (Date.now() - start < 90_000) {
    await page.waitForTimeout(750); body = await page.locator('body').innerText();
    if (body.includes('DIALOG012_METADATA_ONLY_OK')) break;
  }
  await page.getByRole('tab', { name: '对话', exact: true }).click().catch(() => {});
  await page.screenshot({ path: `${dir}/result.png` });
  body = await page.locator('body').innerText(); fs.writeFileSync(`${dir}/result.txt`, body.slice(-5000), 'utf8');
  let trace = '';
  const traceTab = page.getByRole('tab', { name: '轨迹', exact: true });
  if (await traceTab.count()) { await traceTab.click(); await page.waitForTimeout(200); trace = await page.locator('body').innerText(); fs.writeFileSync(`${dir}/trace.txt`, trace.slice(-7000), 'utf8'); await page.screenshot({ path: `${dir}/trace.png` }); }
  const state = { captured_at: new Date().toISOString(), initial_visible_state: bodyPre, permission, model, file_input: pathInput, prompt, elapsed_ms: Date.now() - start, marker_seen: body.includes('DIALOG012_METADATA_ONLY_OK'), trace_tail: trace.slice(-3500), tools_seen_for_this_turn: /第 1 轮[\s\S]*?工具/.test(trace) };
  fs.writeFileSync(`${dir}/result.json`, JSON.stringify(state, null, 2), 'utf8');
  console.log(JSON.stringify(state)); await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
