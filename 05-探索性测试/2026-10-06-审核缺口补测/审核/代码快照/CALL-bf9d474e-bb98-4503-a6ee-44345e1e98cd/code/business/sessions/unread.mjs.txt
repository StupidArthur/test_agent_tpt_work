// G8-02/G8-03: unread marker semantics, entering clears reminder, history still readable.
import { withApp, sleep, newTask, selectProject, typeAndSend, waitTerminal, sessionId, lastAssistantText } from '../../automation/tpt.mjs';

async function makeSession(page, token) {
  await newTask(page);
  await selectProject(page).catch(() => {});
  await typeAndSend(page, token);
  await waitTerminal(page, { timeout: 180000, expect: token });
  await sleep(1200);
  return sessionId(page);
}

async function markUnread(page, session) {
  const key = `session:${session}`;
  const row = page.locator(`[data-row-key="${key}"]`).first();
  await row.hover().catch(() => {});
  await page.locator(`[data-row-key="${key}"] button[aria-label*="的操作"]`).first().click({ timeout: 6000 });
  await sleep(800);
  const mi = page.getByText('标记为未读', { exact: true });
  if (await mi.count()) await mi.first().click({ timeout: 5000 });
  await sleep(1200);
}

function unreadRead(page, session) {
  return page.evaluate((sid) => {
    const key = 'session:' + sid;
    const row = document.querySelector(`[data-row-key="${key}"]`);
    if (!row) return null;
    const status = row.querySelector('[data-tpt-region-row-status]');
    const text = status ? (status.innerText || '') : '';
    const dots = [...row.querySelectorAll('[class*="_dot_"]')];
    const unread = /未读/.test(text);
    const raw = { status_text: text.trim(), data_state: dots.map((d) => d.getAttribute('data-state')), dot_count: dots.length };
    return { unread, dot_count: dots.length, extra: Math.max(0, dots.length - 1), raw };
  }, session);
}

export async function sessionsUnread(ctx, args) {
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    const out = {};
    const token = '只回答：UNREAD_OK';
    const sA = await makeSession(page, token);
    const sB = await makeSession(page, '只回答：UNREAD_B_OK');
    out.sessions = { A: sA, B: sB };

    await recorder.action('标记A为未读', 'click', '会话A行操作->标记为未读', async () => { await markUnread(page, sA); });
    const rA_unread = await recorder.read('A完成未读提醒数', 'session.unread.A', {
      channel: 'dom', scope: '侧栏会话A行状态', locator: `[data-row-key="session:${sA}"] [data-tpt-region-row-status]`,
    }, async () => {
      const v = await unreadRead(page, sA);
      if (!v) return { value: null, raw: null, reason: 'A row not found' };
      return { value: v.unread ? 1 : 0, raw: v.raw, derivation: "row status text contains 未读 -> 1" };
    });
    const rA_extra = await recorder.read('A重复独立未读标记数', 'session.unread.A.extra', {
      channel: 'dom', scope: '侧栏会话A行状态', locator: `[data-row-key="session:${sA}"] [class*="_dot_"]`,
    }, async () => {
      const v = await unreadRead(page, sA);
      if (!v) return { value: null, raw: null, reason: 'A row not found' };
      return { value: v.extra, raw: v.raw, derivation: 'dot_count - 1 (additional unread markers beside primary)' };
    });

    // enter A
    await recorder.action('进入会话A', 'click', '侧栏会话A行', async () => {
      await page.locator(`[data-row-key="session:${sA}"] .YDXeBa_title`).first().click({ timeout: 6000 });
      await sleep(2500);
    });
    const rA_after = await recorder.read('A未读提醒', 'session.unread.A.after', {
      channel: 'dom', scope: '侧栏会话A行状态', locator: `[data-row-key="session:${sA}"] [data-tpt-region-row-status]`,
    }, async () => {
      const v = await unreadRead(page, sA);
      if (!v) return { value: null, raw: null, reason: 'A row not found' };
      return { value: v.unread ? 1 : 0, raw: v.raw, derivation: "row status text contains 未读 -> 1" };
    });
    const rA_history = await recorder.read('A历史正文可访问', 'session.history.A', {
      channel: 'dom', scope: '会话A/助手正文', locator: '[class*="hWmORq_body"]',
    }, async () => {
      const t = (await lastAssistantText(page)).trim();
      return { value: t.length > 0, raw: { length: t.length, sample: t.slice(0, 120) }, derivation: 'assistant body non-empty' };
    });

    out.G8_03 = { unreadRead: rA_unread.event_id, unread: rA_unread.value, extraRead: rA_extra.event_id, extra: rA_extra.value };
    out.G8_02 = { afterRead: rA_after.event_id, after: rA_after.value, historyRead: rA_history.event_id, history: rA_history.value };
    return out;
  });
}
