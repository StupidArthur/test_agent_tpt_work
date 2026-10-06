const fs = require('fs');
const { chromium } = require(process.env.TEMP + '/tpt-cdp/node_modules/playwright-core');
(async () => {
  const dir = '探索性测试/2026-10-05-需求用例全量探索/证据/DIALOG-034-NIGHT-20261006';
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9234');
  const page = browser.contexts()[0].pages()[0];
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.waitForTimeout(250);
  const project = page.getByRole('button', { name: '选择项目' });
  if (await project.count()) {
    await project.click({ force: true }); await page.waitForTimeout(100);
    await page.getByRole('menuitem', { name: 'tpt-workspace', exact: true }).click({ force: true }); await page.waitForTimeout(150);
  }
  const mode = page.getByRole('button', { name: /访问模式/ });
  if ((await mode.getAttribute('aria-label')).includes('仅可查看')) {
    await mode.click({ force: true }); await page.waitForTimeout(80);
    await page.getByRole('menuitem', { name: '工作区内修改', exact: true }).click({ force: true }); await page.waitForTimeout(100);
  }
  const initial = { project_label: (await page.locator('body').innerText()).slice(-280), permission: await mode.getAttribute('aria-label'), model: await page.getByRole('button', { name: /选择模型/ }).getAttribute('aria-label') };
  if (!initial.project_label.includes('tpt-workspace') || !initial.permission.includes('工作区内修改') || !initial.model.includes('标准') || !initial.model.includes('low')) throw new Error(JSON.stringify(initial));
  const prompt = 'In the existing tpt-workspace, create exactly one new folder DIALOG034-round-owned and one UTF-8 text file process-log.txt inside it. Write exactly 70 numbered short lines (01–70), each containing DIALOG034_ACTION_UPDATE_20261006 and a distinct sequential number. Do not modify, read, move, or delete anything outside that newly named folder. Do not run commands, use networks, devices, connectors, or other tools. Verify only this file and the number of lines using workspace file tools; report the exact path and count, not all lines. This is an explicitly authorized harmless fixture for current UI progress exploration.';
  await page.locator('[contenteditable=true]:visible').first().fill(prompt);
  await page.screenshot({ path: `${dir}/prompt-before-send.png` });
  const timeline = [];
  const bodyTail = async () => (await page.locator('body').innerText()).slice(-1800);
  let lastKey = '';
  const start = Date.now();
  await page.getByRole('button', { name: '发送消息' }).click();
  while (Date.now() - start < 120_000) {
    await page.waitForTimeout(300);
    const tail = await bodyTail();
    const key = tail.split('\n').filter(s => /正在|探索中|已完成|读取文件|执行了|写入|验证|DIALOG034_ACTION_UPDATE_20261006/.test(s)).slice(-8).join('\n');
    if (key && key !== lastKey) {
      const entry = { at_ms: Date.now() - start, text: key };
      timeline.push(entry); lastKey = key;
      if (timeline.length <= 12) await page.screenshot({ path: `${dir}/live-${String(timeline.length).padStart(2, '0')}.png` });
    }
    const hasFinal = tail.includes('已完成工作') && tail.includes('DIALOG034_ACTION_UPDATE_20261006') && tail.includes('70');
    const busy = /探索中|正在运行命令|正在执行|写入中|读取中/.test(tail.slice(-450));
    if (hasFinal && !busy && Date.now() - start > 2_000) break;
  }
  await page.getByRole('tab', { name: '对话', exact: true }).click().catch(() => {});
  await page.waitForTimeout(150);
  const result = await bodyTail();
  await page.screenshot({ path: `${dir}/result.png` });
  fs.writeFileSync(`${dir}/result.txt`, result, 'utf8');
  await page.getByRole('tab', { name: '轨迹', exact: true }).click().catch(() => {});
  await page.waitForTimeout(200);
  const trace = await bodyTail();
  fs.writeFileSync(`${dir}/trace.txt`, trace, 'utf8');
  await page.screenshot({ path: `${dir}/trace.png` });
  fs.writeFileSync(`${dir}/timeline.json`, JSON.stringify({ captured_at: new Date().toISOString(), initial, elapsed_ms: Date.now() - start, timeline, result_tail: result, trace_tail: trace }, null, 2), 'utf8');
  console.log(JSON.stringify({ elapsed_ms: Date.now() - start, timeline, result: result.slice(-1400), trace: trace.slice(-1400) }));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
