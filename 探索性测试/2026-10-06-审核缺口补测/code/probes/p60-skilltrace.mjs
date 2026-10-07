import fs from 'node:fs';
import { withApp } from '../automation/tpt.mjs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  const info = await page.evaluate(() => {
    const chat = document.querySelector('[data-conversation-region="chat"]');
    if (!chat) return null;
    const nodes = [...chat.querySelectorAll('[data-slot="conversation.chat.node"]')];
    const scan = (root) => [...root.querySelectorAll('*')].filter((e) => e.children.length === 0 && /技能|已加载|skill|Skill|资源|reference/i.test(e.textContent || '')).map((e) => ({ t: (e.textContent || '').trim().slice(0, 60), cls: (e.className || '').toString().slice(0, 40) })).slice(0, 30);
    return { session: document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session'), chatText: chat.innerText.replace(/\s+/g, ' ').slice(-500), hits: scan(chat), tools: [...chat.querySelectorAll('[data-slot="tool.call.toolview"]')].map((v) => ({ attr: v.getAttribute('data-slot'), text: (v.textContent || '').replace(/\s+/g, ' ').slice(0, 200) })) };
  });
  console.log(JSON.stringify(info, null, 2));
});
