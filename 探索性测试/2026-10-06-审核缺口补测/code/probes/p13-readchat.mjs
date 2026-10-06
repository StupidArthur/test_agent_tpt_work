import { withApp } from '../automation/tpt.mjs';
import fs from 'node:fs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  const t = await page.evaluate(() => {
    const c = document.querySelector('[data-conversation-region="chat"]');
    return { session: document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session'), text: c ? c.innerText : null };
  });
  console.log(t.session);
  console.log(t.text);
});
