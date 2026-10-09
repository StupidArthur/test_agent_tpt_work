const fs = require('fs');
const { chromium } = require(process.env.TEMP + '/tpt-cdp/node_modules/playwright-core');
(async () => {
  const dir = '探索性测试/2026-10-05-需求用例全量探索/证据/DIALOG-049-NIGHT-20261006';
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
  const page = browser.contexts()[0].pages()[0];
  await page.setViewportSize({ width: 1100, height: 800 });
  const mode = page.getByRole('button', { name: /访问模式/ }).first();
  if (!(await mode.getAttribute('aria-label')).includes('仅可查看')) {
    await mode.click({ force: true });
    await page.getByRole('menuitem', { name: '仅可查看', exact: true }).click();
  }
  const editor = page.locator('[contenteditable=true]:visible').first();
  const prompt = '在当前已选的 tpt-workspace 项目中，只通过可用工作区文件工具读取唯一文件 DIALOG060-round-owned/index.html。不要读取任何其他文件；不要新建、修改或删除内容；不要运行HTML或命令。报告这个文件的title、H1和段落原文，并给出一个能从答复与置顶摘要继续打开的该同一文件索引/引用。用唯一标记 DIALOG049_INDEX_20261006 标明本轮结果。';
  await editor.fill(prompt);
  await page.screenshot({ path: `${dir}/prompt-before-send.png` });
  const pre = { project: (await page.locator('body').innerText()).slice(-350), model: await page.getByRole('button', { name: /选择模型/ }).getAttribute('aria-label'), permission: await page.getByRole('button', { name: /访问模式/ }).getAttribute('aria-label') };
  if (!pre.permission.includes('仅可查看')) throw new Error(`Expected read-only: ${JSON.stringify(pre)}`);
  await page.getByRole('button', { name: '发送消息' }).click();
  const start = Date.now();
  let body = '';
  while (Date.now() - start < 100_000) {
    await page.waitForTimeout(750);
    body = await page.locator('body').innerText();
    const disabled = await page.getByRole('button', { name: '发送消息' }).isDisabled().catch(() => true);
    if (!disabled && body.includes('DIALOG049_INDEX_20261006') && Date.now() - start > 4_000) break;
  }
  await page.getByRole('tab', { name: '对话', exact: true }).click().catch(() => {});
  await page.screenshot({ path: `${dir}/read-result.png` });
  body = await page.locator('body').innerText();
  fs.writeFileSync(`${dir}/read-result.txt`, body.slice(-6000), 'utf8');
  const traceTab = page.getByRole('tab', { name: '轨迹', exact: true });
  let trace = '';
  if (await traceTab.count()) {
    await traceTab.click(); await page.waitForTimeout(250);
    trace = (await page.locator('body').innerText()).slice(-7000);
    fs.writeFileSync(`${dir}/read-trace.txt`, trace, 'utf8');
    await page.screenshot({ path: `${dir}/read-trace.png` });
    await page.getByRole('tab', { name: '对话', exact: true }).click(); await page.waitForTimeout(150);
  }
  const pin = page.getByRole('button', { name: '置顶摘要', exact: true });
  const pinExists = await pin.count();
  let pinText = '';
  if (pinExists) {
    await pin.click(); await page.waitForTimeout(250);
    pinText = (await page.locator('body').innerText()).slice(-3000);
    await page.screenshot({ path: `${dir}/pin-summary-open.png` });
  }
  fs.writeFileSync(`${dir}/result.json`, JSON.stringify({ captured_at: new Date().toISOString(), pre, elapsed_ms: Date.now() - start, marker_seen: body.includes('DIALOG049_INDEX_20261006'), file_name_seen: body.includes('index.html'), h1_seen: body.includes('DIALOG060_RENDERED_OK'), paragraph_seen: body.includes('HTML_SOURCE_AND_RENDER_SAMPLE'), pin_button_found: !!pinExists, pinned_surface_excerpt: pinText, trace_excerpt: trace.slice(-3000) }, null, 2), 'utf8');
  console.log(JSON.stringify({ elapsed_ms: Date.now() - start, pre, marker: body.includes('DIALOG049_INDEX_20261006'), file: body.includes('index.html'), h1: body.includes('DIALOG060_RENDERED_OK'), paragraph: body.includes('HTML_SOURCE_AND_RENDER_SAMPLE'), pin_button_found: !!pinExists, pinExcerpt: pinText.slice(-1200), result: body.slice(-1800), trace: trace.slice(-2500) }));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
