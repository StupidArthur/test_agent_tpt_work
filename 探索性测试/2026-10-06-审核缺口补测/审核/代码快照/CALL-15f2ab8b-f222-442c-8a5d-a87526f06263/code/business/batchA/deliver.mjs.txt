// Batch A: G8-08 explicit file delivery.
import path from 'node:path';
import fs from 'node:fs';
import { withApp, sleep, newTask, selectProject, typeAndSend, waitTerminal, lastAssistantText } from '../../automation/tpt.mjs';

export async function batchDeliver(ctx, args) {
  const root = ctx.taskRoot;
  const run = ctx.runtime.extension_run;
  const workDir = 'D:\\code\\tpt-workspace\\.fast-assert-' + run;
  const deliver = path.join(workDir, 'deliver.txt');
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    try { fs.unlinkSync(deliver); } catch { /* absent is fine */ }
    await newTask(page);
    await selectProject(page).catch(() => {});
    const act = await recorder.action('请求生成本轮文件', 'fill+click', '创建 deliver.txt=FAST_DELIVER_OK', async () => {
      await typeAndSend(page, '请在目录 ' + workDir + ' 中创建文件 deliver.txt，内容为一行 FAST_DELIVER_OK。只做这一件事。');
      await waitTerminal(page, { timeout: 180000 });
      await sleep(2000);
    });
    const rReply = await recorder.read('本轮执行终态回复', 'deliver.reply', {
      channel: 'dom', scope: '本轮回复助手正文', locator: '[class*="hWmORq_body"]',
    }, async () => ({ value: (await lastAssistantText(page)).trim(), raw: { session: await page.evaluate(() => document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? null) } }));
    const rFile = await recorder.read('实际deliver.txt文件内容', deliver, {
      channel: 'file', scope: '本轮工作目录', locator: deliver,
    }, async () => {
      const exists = fs.existsSync(deliver);
      const content = exists ? fs.readFileSync(deliver, 'utf8').trim() : null;
      return { value: content, raw: { exists, path: deliver }, reason: exists ? undefined : 'deliver.txt 不存在' };
    });
    const rCard = await recorder.read('当前任务产物文件身份', 'deliver.product-card', {
      channel: 'dom', scope: '本轮会话/产物文件卡或文件引用', locator: '[class*="fileLink"], [data-slot*="file"], [class*="fileCard"]',
    }, async () => {
      const raw = await page.evaluate(() => {
        const chat = document.querySelector('[data-conversation-region="chat"]');
        if (!chat) return { found: false, cards: [] };
        const els = [...chat.querySelectorAll('[class*="fileLink"],[data-slot*="file"],[class*="fileCard"],[class*="FileCard"],[class*="artifact"]')].filter((e) => e.offsetWidth || e.offsetHeight);
        const cards = els.map((e) => ({ cls: (e.className || '').toString().slice(0, 60), text: (e.textContent || '').replace(/\s+/g, ' ').slice(0, 120), href: e.getAttribute('href') || e.getAttribute('data-path') || e.getAttribute('title') || null }));
        return { found: cards.length > 0, cards };
      });
      const match = raw.cards.find((c) => /deliver\.txt/.test(c.text) && (c.href ? c.href.replace(/\//g, '\\').toLowerCase().includes(deliver.toLowerCase()) : false));
      const value = !!match;
      return { value, raw: { cards: raw.cards, deliver_abs: deliver }, derivation: 'a product/file card resource path equals deliver.txt absolute path' };
    });
    return { G8_08: { action: act.event_id, replyRead: rReply.event_id, reply: rReply.value, fileRead: rFile.event_id, fileContent: rFile.value, cardRead: rCard.event_id, cardMatch: rCard.value } };
  });
}
