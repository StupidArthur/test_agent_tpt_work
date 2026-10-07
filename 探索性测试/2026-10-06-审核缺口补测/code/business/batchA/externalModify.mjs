// Batch A: G10-07 valid external modification takes effect; G10-09 no local-modified label during modification.
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { withApp, sleep, newTask, selectProject, typeAndSend, waitTerminal, lastAssistantText } from '../../automation/tpt.mjs';
import { ensureList, findCardIndexByInternalName, cardByTitle, search, clearSearch } from '../../automation/skills.mjs';

const RICH = 'fast-assert-rich-20261006-agent2';
const SKILL_MD = 'C:\\Users\\Administrator\\.tpt-work\\dsh\\skills\\' + RICH + '\\SKILL.md';
const hash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

async function setRichEnabled(page, on) {
  const f = await ensureList(page);
  const res = await findCardIndexByInternalName(f, RICH, RICH);
  if (!res.matched) return false;
  const card = (await cardByTitle(f, RICH)).nth(res.index);
  const sw = card.locator('[role="switch"]').first();
  const cur = await sw.getAttribute('aria-checked');
  if (cur !== String(on)) { await sw.click({ timeout: 5000 }).catch(() => {}); await sleep(1200); }
  return true;
}

export async function batchExternalModify(ctx, args) {
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    const out = {};
    const orig = fs.readFileSync(SKILL_MD, 'utf8');
    const rHashBefore = await recorder.read('本轮实际安装SKILL.md绝对路径', SKILL_MD, {
      channel: 'file', scope: 'rich安装目录', locator: SKILL_MD,
    }, async () => ({ value: hash(SKILL_MD), raw: { path: SKILL_MD } }));

    const actMod = await recorder.action('外部合法修改SKILL.md', 'file-write', 'FAST_RICH_BASE_OK->FAST_RICH_NEW_OK', async () => {
      fs.writeFileSync(SKILL_MD, orig.replace('FAST_RICH_BASE_OK', 'FAST_RICH_NEW_OK'), 'utf8');
      await sleep(800);
    });
    await setRichEnabled(page, true);

    // G10-09 read card tag during modification (before restore)
    const rTag = await recorder.read('本轮卡片已本地修改标签', 'rich.card.local-modified', {
      channel: 'dom', scope: '技能iframe/rich卡片标签列表', locator: '[data-slot="card"]',
    }, async () => {
      const f = await ensureList(page);
      const res = await findCardIndexByInternalName(f, RICH, RICH);
      let cardText = '';
      if (res.matched) {
        const card = (await cardByTitle(f, RICH)).nth(res.index);
        cardText = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      }
      const has = /本地修改|已修改|外部修改/.test(cardText);
      return { value: has, raw: { card_text: cardText.slice(0, 300), matched: res.matched, modified_during_read: true }, derivation: 'rich card text contains a local-modified label' };
    });

    // invoke rich (modified)
    await newTask(page);
    await selectProject(page).catch(() => {});
    const actCall = await recorder.action('调用rich技能', 'type+click', '/rich 请执行固定回复规则', async () => {
      const composer = page.locator('[contenteditable="true"]').first();
      await composer.click({ timeout: 8000 });
      await page.keyboard.type('/' + RICH + ' ');
      await sleep(500);
      await page.keyboard.type('请执行固定回复规则');
      await sleep(500);
      const send = page.locator('button[aria-label="发送消息"]').first();
      for (let i = 0; i < 40; i++) { if (!(await send.isDisabled().catch(() => true))) break; await sleep(300); }
      await send.click({ timeout: 8000 });
    });
    const term = await waitTerminal(page, { timeout: 180000 });
    await sleep(1500);
    const rReply = await recorder.read('合法修改后的新任务正文', 'rich.newreply', {
      channel: 'dom', scope: '本轮回复助手正文', locator: '[class*="hWmORq_body"]',
    }, async () => {
      const t = (await lastAssistantText(page)).trim();
      return { value: t, raw: { terminal_ok: term.ok, ms: term.ms } };
    });
    const rRes = await recorder.read('新任务加载技能资源内容', 'rich.newtrace', {
      channel: 'dom', scope: '本轮session/本次请求轨迹内的rich加载记录', locator: '[class*="summaryText"], [class*="_text_av0fe_33"]',
    }, async () => {
      let raw = null;
      for (let i = 0; i < 12; i++) {
        raw = await page.evaluate(() => {
          const chat = document.querySelector('[data-conversation-region="chat"]');
          if (!chat) return null;
          const nodes = [...chat.querySelectorAll('[class*="summaryText"], [class*="_text_av0fe_33"], [class*="lcKema"]')];
          const recs = [...new Set(nodes.map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter((t) => t.length > 0 && /skill|技能/i.test(t)))];
          return { records: recs.slice(0, 10), hit: recs.find((t) => /fast-assert-rich-20261006-agent2/.test(t)) };
        });
        if (raw && raw.hit) break;
        await sleep(1000);
      }
      if (!raw || !raw.hit) return { value: null, raw, reason: '本轮轨迹未出现可区分的rich技能加载记录', failed_dependency: '技能加载记录可见性' };
      return { value: raw.hit, raw, derivation: 'trajectory record references rich skill and its instruction body' };
    });

    await recorder.action('恢复SKILL.md', 'file-write', 'restore', async () => { fs.writeFileSync(SKILL_MD, orig, 'utf8'); await sleep(800); });
    const rHashAfter = await recorder.read('本轮实际安装SKILL.md绝对路径', SKILL_MD, {
      channel: 'file', scope: 'rich安装目录', locator: SKILL_MD,
    }, async () => ({ value: hash(SKILL_MD), raw: { path: SKILL_MD } }));

    out.G10_07 = { hashBefore: rHashBefore.event_id, modAction: actMod.event_id, callAction: actCall.event_id, replyRead: rReply.event_id, reply: rReply.value, resRead: rRes.event_id, res: rRes.value, hashAfter: rHashAfter.event_id };
    out.G10_09 = { tagRead: rTag.event_id, value: rTag.value };
    return out;
  });
}
