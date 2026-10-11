// Batch A: G3-03 skill use entry + new session chip; G3-04 loaded resource record.
import fs from 'node:fs';
import { withApp, sleep, sessionId, typeAndSend, waitTerminal, lastAssistantText, newTask } from '../../automation/tpt.mjs';
import { ensureList, findCardIndexByInternalName, cardByTitle } from '../../automation/skills.mjs';

const SKILL_NAME = 'fast-assert-skillc-20261006-agent2';
const SKILL_TITLE = '本轮快速回归技能';

async function enableSkill(page, frame) {
  const res = await findCardIndexByInternalName(frame, SKILL_TITLE, SKILL_NAME);
  if (!res.matched) return { matched: false };
  const card = (await cardByTitle(frame, SKILL_TITLE)).nth(res.index);
  const sw = card.locator('[role="switch"]').first();
  const state = await sw.getAttribute('aria-checked');
  if (state !== 'true') { await sw.click({ timeout: 5000 }).catch(() => {}); await sleep(1200); }
  return { matched: true, wasEnabled: state === 'true' };
}

export async function batchSkillUse(ctx, args) {
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    const out = {};
    // start from a fresh task view (no active chat session), matching the natural "use this skill" flow
    await newTask(page);
    await sleep(800);
    const before = await sessionId(page);
    const rBefore = await recorder.read('此前活动会话身份', 'skilluse.session.before', {
      channel: 'dom', scope: '主任务视图/当前会话', locator: '[data-conversation-session]',
    }, async () => ({ value: before, raw: { session: before, note: before === null ? '点击使用前无活动会话（空任务视图）' : '已有活动会话' } }));

    const frame = await ensureList(page);
    const en = await enableSkill(page, frame);
    out.enabled = en;
    const res = await findCardIndexByInternalName(frame, SKILL_TITLE, SKILL_NAME);
    const actUse = await recorder.action('技能详情点击使用', 'click', '使用', async () => {
      const f = await ensureList(page);
      const r = await findCardIndexByInternalName(f, SKILL_TITLE, SKILL_NAME);
      const card = (await cardByTitle(f, SKILL_TITLE)).nth(r.index);
      await card.locator('[data-slot="card-content"]').click({ timeout: 8000 });
      await sleep(1200);
      await f.getByRole('button', { name: '使用', exact: true }).click({ timeout: 8000 });
      await sleep(2500);
    });
    const rChip = await recorder.read('新会话技能引用', 'skilluse.chip', {
      channel: 'dom', scope: '新会话/composer技能chip', locator: '[contenteditable="true"]',
    }, async () => {
      const text = await page.evaluate(() => document.querySelector('[contenteditable="true"]')?.innerText ?? '');
      const m = text.match(/fast-assert-[A-Za-z0-9-]+/);
      return { value: m ? m[0] : text.trim(), raw: { composerText: text } };
    });
    const after = await sessionId(page);
    const rAfter = await recorder.read('调用会话身份', 'skilluse.session.after', {
      channel: 'dom', scope: '新会话/当前会话', locator: '[data-conversation-session]',
    }, async () => ({ value: after, raw: { session_after_use: await sessionId(page) } }));

    // send harmless request via the SAME composer (no newTask, no manual slash)
    const actReq = await recorder.action('发送技能无害请求', 'fill+click', '请执行本技能的固定回复规则', async () => {
      const composer = page.locator('[contenteditable="true"]').first();
      await composer.click({ timeout: 8000 });
      await page.keyboard.press('End');
      await page.keyboard.type('请执行本技能的固定回复规则');
      await sleep(400);
      const send = page.locator('button[aria-label="发送消息"]').first();
      for (let i = 0; i < 40; i++) { if (!(await send.isDisabled().catch(() => true))) break; await sleep(300); }
      await send.click({ timeout: 8000 });
    });
    const term = await waitTerminal(page, { timeout: 180000 });
    await sleep(1500);
    const boundSession = await sessionId(page);
    const rBound = await recorder.read('发送后绑定会话身份', 'skilluse.session.bound', {
      channel: 'dom', scope: '本轮调用会话', locator: '[data-conversation-session]',
    }, async () => ({ value: boundSession, raw: { session_bound: boundSession, session_before: before } }));
    const rReply = await recorder.read('本轮助手正文', 'skilluse.reply', {
      channel: 'dom', scope: '本轮回复助手正文', locator: '[class*="hWmORq_body"]',
    }, async () => {
      const t = (await lastAssistantText(page)).trim();
      return { value: t, raw: { terminal_ok: term.ok, ms: term.ms } };
    });
    const rTrace = await recorder.read('本轮调用Trace', 'skilluse.trace', {
      channel: 'dom', scope: '本轮session/本轮请求轨迹内的技能调用记录', locator: '[class*="lcKema_summaryText"], [class*="_text_av0fe_33"]',
    }, async () => {
      let raw = null;
      for (let i = 0; i < 12; i++) {
        raw = await page.evaluate(() => {
          const chat = document.querySelector('[data-conversation-region="chat"]');
          if (!chat) return null;
          const nodes = [...chat.querySelectorAll('[class*="summaryText"], [class*="_text_av0fe_33"], [class*="lcKema"]')];
          const recs = nodes.map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter((t) => t.length > 0 && /skill|技能/i.test(t));
          const hit = recs.find((t) => /fast-assert-skillc-20261006-agent2/.test(t));
          return { records: [...new Set(recs)].slice(0, 10), hit };
        });
        if (raw && raw.hit) break;
        await sleep(1000);
      }
      if (!raw) return { value: null, raw: null, reason: 'chat region not found' };
      if (!raw.hit) return { value: null, raw, reason: '本轮轨迹未出现可区分的技能加载记录', failed_dependency: '技能加载记录在UI的可见性' };
      return { value: raw.hit, raw, derivation: '本轮轨迹记录引用了技能内部name' };
    });

    out.G3_03 = { beforeRead: rBefore.event_id, useAction: actUse.event_id, chipRead: rChip.event_id, chip: rChip.value, afterRead: rAfter.event_id, sessionBefore: before, sessionAfter: after, boundRead: rBound.event_id, sessionBound: boundSession };
    out.G3_04 = { reqAction: actReq.event_id, replyRead: rReply.event_id, reply: rReply.value, traceRead: rTrace.event_id, trace: rTrace.value };
    return out;
  });
}
