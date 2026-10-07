// Batch A: G7-12 sent user bubble attachment is fixed (name present, no remove control).
import path from 'node:path';
import { withApp, sleep, newTask, selectProject, typeAndSend, waitTerminal } from '../../automation/tpt.mjs';

export async function batchAttachmentSend(ctx, args) {
  const root = ctx.taskRoot;
  const run = ctx.runtime.extension_run;
  const file = path.join(root, '夹具', '本轮', run, 'attachments', 'attachment-a.txt');
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    await newTask(page);
    await selectProject(page).catch(() => {});
    // clear existing attachments
    for (let i = 0; i < 60; i++) {
      const b = page.locator('[role="group"][aria-label="待发送附件"] button[aria-label^="移除文件"]').first();
      if (!(await b.count())) break;
      await b.click({ timeout: 3000 }).catch(() => {}); await sleep(100);
    }
    const actAttach = await recorder.action('添加附件attachment-a.txt', 'setInputFiles', 'attachment-a.txt', async () => {
      await page.locator('input[type="file"]').first().setInputFiles(file);
      await sleep(2000);
    });
    const actSend = await recorder.action('发送附件请求', 'fill+click', '确认附件已收到', async () => {
      await typeAndSend(page, '确认附件已收到，不要读取附件内容。');
      await waitTerminal(page, { timeout: 180000 });
      await sleep(1500);
    });
    const rName = await recorder.read('已发送气泡附件', 'sent.bubble.attachment-a', {
      channel: 'dom', scope: '本条已发送用户消息/附件区', locator: '[class*="Sixlwa_userRow"]',
    }, async () => {
      const raw = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('[class*="Sixlwa_userRow"]')];
        const last = rows[rows.length - 1];
        if (!last) return null;
        const text = (last.innerText || '').replace(/\s+/g, ' ');
        return { text: text.slice(0, 200), hasName: /attachment-a\.txt/.test(text) };
      });
      return { value: raw ? raw.hasName : null, raw, reason: raw ? undefined : 'no sent user bubble found', derivation: 'sent user bubble text contains attachment-a.txt' };
    });
    const rDel = await recorder.read('已发送附件删除入口', 'sent.bubble.remove-controls', {
      channel: 'dom', scope: '本条已发送用户消息/附件区', locator: '[class*="Sixlwa_userRow"] button',
    }, async () => {
      const raw = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('[class*="Sixlwa_userRow"]')];
        const last = rows[rows.length - 1];
        if (!last) return null;
        const btns = [...last.querySelectorAll('button')];
        const del = btns.filter((b) => /移除|删除|remove/i.test((b.getAttribute('aria-label') || '') + (b.title || '')));
        return { button_count: btns.length, remove_count: del.length, remove_labels: del.map((b) => b.getAttribute('aria-label') || b.title) };
      });
      return { value: raw ? raw.remove_count : null, raw, reason: raw ? undefined : 'no sent user bubble found' };
    });
    return {
      G7_12: {
        attachAction: actAttach.event_id, sendAction: actSend.event_id,
        nameRead: rName.event_id, name: rName.value,
        delRead: rDel.event_id, delCount: rDel.value,
      },
    };
  });
}
