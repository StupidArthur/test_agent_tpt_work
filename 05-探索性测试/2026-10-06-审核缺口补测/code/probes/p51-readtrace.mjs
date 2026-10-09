import fs from 'node:fs';
import { withApp, sleep, newTask, selectProject, typeAndSend, waitTerminal, lastAssistantText, runningCount } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await newTask(page);
  await selectProject(page).catch(() => {});
  await typeAndSend(page, '请在目录 D:\\code\\tpt-workspace\\.fast-assert-20261006-agent2 中读取 flow.txt 文件，然后只回复该文件内容。');
  const term = await waitTerminal(page, { timeout: 180000 });
  console.log('term', term.ok, term.ms, 'running', await runningCount(page));
  console.log('reply', (await lastAssistantText(page)).slice(0, 300));
  // open 轨迹 tab
  const tab = page.getByRole('button', { name: '轨迹', exact: true });
  console.log('trace tab count', await tab.count());
  if (await tab.count()) { await tab.click({ timeout: 5000 }).catch(() => {}); await sleep(2000); }
  const t = await page.evaluate(() => {
    const chat = document.querySelector('[data-conversation-region="chat"]');
    return chat ? chat.innerText.replace(/\s+/g, ' ').slice(-800) : null;
  });
  console.log('after trace tab', t);
});
