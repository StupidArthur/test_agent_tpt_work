import fs from 'node:fs';
import { withApp, sleep, newTask, selectProject, typeAndSend, waitTerminal } from '../automation/tpt.mjs';
import { openSettings, openSection, closeSettings, setSelector } from '../automation/settings.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await closeSettings(page);
  const info = await page.evaluate(() => {
    const chat = document.querySelector('[data-conversation-region="chat"]');
    const all = [...chat.querySelectorAll('*')].filter((e) => /TS9iAW|usage|Usage/.test((e.className || '').toString()));
    return all.map((e) => ({ cls: (e.className || '').toString().slice(0, 60), text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120) }));
  });
  console.log('TS9iAW elements', JSON.stringify(info, null, 2).slice(0, 1500));
  // read the last assistant reply tail
  const tail = await page.evaluate(() => {
    const chat = document.querySelector('[data-conversation-region="chat"]');
    const nodes = [...chat.querySelectorAll('[data-slot="conversation.chat.node"]')];
    return nodes.slice(-3).map((n) => ({ text: (n.innerText || '').replace(/\s+/g, ' ').trim().slice(-160) }));
  });
  console.log('lastNodes', JSON.stringify(tail, null, 2));
});
