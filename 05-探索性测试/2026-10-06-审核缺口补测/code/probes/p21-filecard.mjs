import { withApp, sleep } from '../automation/tpt.mjs';
import fs from 'node:fs';
const ctx = { environment: JSON.parse(fs.readFileSync('环境记录.json', 'utf8')), runtime: JSON.parse(fs.readFileSync('运行上下文.json', 'utf8')) };
await withApp(ctx, async (page) => {
  await page.keyboard.press('Escape').catch(() => {});
  const row = page.getByText('在当前工作区创建 DIALOG047-round', { exact: false }).first();
  console.log('row count', await row.count());
  await row.click({ timeout: 8000 }).catch((e) => console.log('err', e.message));
  await sleep(3000);
  const info = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const chat = document.querySelector('[data-conversation-region="chat"]');
    const cards = chat ? [...chat.querySelectorAll('*')].filter((e) => /card|Card|file|File|artifact|deliver/i.test((e.className || '').toString()) && (e.offsetWidth || e.offsetHeight)) : [];
    const uniq = [...new Set(cards.map((e) => ((e.className || '').toString().match(/[A-Za-z0-9_]*([Cc]ard|[Ff]ile|[Aa]rtifact|[Dd]eliver)[A-Za-z0-9_]*/) || [''])[0]))];
    const withSlot = chat ? [...chat.querySelectorAll('[data-slot*="file"],[data-slot*="artifact"],[data-slot*="deliver"]')].map((e) => ({ slot: e.getAttribute('data-slot'), text: norm(e.innerText).slice(0, 80) })) : [];
    return { session: document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session'), uniq, withSlot, chatText: chat ? norm(chat.innerText).slice(0, 700) : null };
  });
  console.log(JSON.stringify(info, null, 2));
  fs.writeFileSync('code/probes/p21-filecard.json', JSON.stringify(info, null, 2), 'utf8');
});
