import fs from 'node:fs';
import { withApp, sleep, newTask, selectProject, typeAndSend, waitTerminal } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await newTask(page);
  await selectProject(page).catch(() => {});
  await typeAndSend(page, '请在目录 D:\\code\\tpt-workspace\\.fast-assert-20261006-agent2 中读取 flow.txt 文件，然后只回复该文件内容。');
  await waitTerminal(page, { timeout: 180000 });
  await sleep(2000);
  const info = await page.evaluate(() => {
    const chat = document.querySelector('[data-conversation-region="chat"]');
    const nodes = [...chat.querySelectorAll('[data-slot="conversation.chat.node"]')];
    const last = nodes.slice(-4);
    return last.map((n) => ({
      text: (n.innerText || '').replace(/\s+/g, ' ').slice(0, 200),
      aria: [...n.querySelectorAll('[aria-expanded]')].map((e) => ({ t: (e.innerText || '').replace(/\s+/g, ' ').slice(0, 40), exp: e.getAttribute('aria-expanded'), cls: (e.className || '').toString().slice(0, 40) })),
      slots: [...new Set([...n.querySelectorAll('[data-slot]')].map((e) => e.getAttribute('data-slot')))],
      classes: [...new Set([...n.querySelectorAll('div[class]')].map((e) => (e.className || '').toString().split(' ')[0]))].slice(0, 30),
    }));
  });
  console.log(JSON.stringify(info, null, 2).slice(0, 4000));
});
