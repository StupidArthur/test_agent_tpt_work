// Batch A cleanup: disable skills enabled/imported this batch, clear draft attachments.
import { withApp, sleep } from '../../automation/tpt.mjs';
import { ensureList, findCardIndexByInternalName, cardByTitle } from '../../automation/skills.mjs';

const NAMES = [
  ['fast-assert-skillc-20261006-agent2', '本轮快速回归技能'],
  ['fast-assert-rich-20261006-agent2', 'fast-assert-rich-20261006-agent2'],
  ['fast-assert-cn-all-20261006-agent2', '本轮中文优先'],
];

export async function batchCleanup(ctx, args) {
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    const out = {};
    for (const [name, title] of NAMES) {
      const read = await recorder.read('技能停用回读', 'cleanup.' + name, {
        channel: 'dom', scope: '技能iframe/本轮卡片开关', locator: '[data-slot="card"] [role="switch"]',
      }, async () => {
        const f = await ensureList(page);
        const res = await findCardIndexByInternalName(f, title, name);
        if (!res.matched) return { value: null, raw: { matched: false, seen: res.seen }, reason: '技能未找到，无法停用' };
        const card = (await cardByTitle(f, title)).nth(res.index);
        const sw = card.locator('[role="switch"]').first();
        const before = await sw.getAttribute('aria-checked');
        if (before === 'true') { await sw.click({ timeout: 5000 }).catch(() => {}); await sleep(1200); }
        const after = await sw.getAttribute('aria-checked');
        return { value: after === 'false', raw: { before, after }, derivation: "after === 'false'" };
      });
      out[name] = { read: read.event_id, value: read.value };
    }
    const actClear = await recorder.action('清理本批草稿附件', 'click', '移除全部待发送附件', async () => {
      for (let i = 0; i < 80; i++) {
        const b = page.locator('[role="group"][aria-label="待发送附件"] button[aria-label^="移除文件"]').first();
        if (!(await b.count())) break;
        await b.click({ timeout: 3000 }).catch(() => {}); await sleep(80);
      }
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(500);
    });
    out.clearAction = actClear.event_id;
    return out;
  });
}
