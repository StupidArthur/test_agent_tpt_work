import { withApp } from '../automation/tpt.mjs';
import fs from 'node:fs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  const info = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const chat = document.querySelector('[data-conversation-region="chat"]');
    const nodes = [...chat.querySelectorAll('[data-slot="conversation.chat.node"]')];
    const view = chat.querySelector('[data-slot="conversation.view"]');
    return {
      session: document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session'),
      nodeCount: nodes.length,
      nodes: nodes.map((n) => ({ cls: n.className, text: norm(n.innerText).slice(0, 200), childClassNames: [...new Set([...n.querySelectorAll('div')].map((e) => e.className).filter(Boolean))].slice(0, 20) })),
      viewChildren: view ? [...view.children].map((c) => ({ cls: c.className, text: norm(c.innerText).slice(0, 120) })) : [],
    };
  });
  console.log(JSON.stringify(info, null, 2));
  fs.writeFileSync('code/probes/p19-nodes.json', JSON.stringify(info, null, 2), 'utf8');
});
