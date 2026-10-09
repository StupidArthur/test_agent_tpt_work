import { withApp, sleep, newTask, selectProject, typeAndSend, waitTerminal, sessionId, lastAssistantText, runningCount } from '../automation/tpt.mjs';
import fs from 'node:fs';

const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await newTask(page);
  const proj = await selectProject(page);
  console.log('proj', JSON.stringify(proj));
  await typeAndSend(page, '请在目录 D:\\code\\tpt-workspace\\.fast-assert-20261006-agent2 中创建文件 g1probe.txt，内容为一行 G1PROBE_OK。只做这一件事，完成后回复"已创建"。');
  const sid = await sessionId(page);
  console.log('session', sid);
  const term = await waitTerminal(page, { timeout: 240000 });
  console.log('term ok=', term.ok, 'ms=', term.ms);
  console.log('running', await runningCount(page));
  console.log('last', (await lastAssistantText(page)).slice(0, 800));
  console.log('file exists', fs.existsSync('D:\\code\\tpt-workspace\\.fast-assert-20261006-agent2\\g1probe.txt'));
});
