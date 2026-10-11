// Batch A: G13-10 card body opens the correct detail (YAML name semantics).
import path from 'node:path';
import { withApp, sleep } from '../../automation/tpt.mjs';
import { ensureList, openImportDialog, setFileAndConfirm, findCardIndexByInternalName, cardByTitle, readDetail } from '../../automation/skills.mjs';

const NAME = 'fast-assert-cn-all-20261006-agent2';
const TITLE = '本轮中文优先';

export async function batchCnAll(ctx, args) {
  const root = ctx.taskRoot;
  const run = ctx.runtime.extension_run;
  const variantFile = path.join(root, '夹具', '本轮', run, 'variants', 'cn-all', 'SKILL.md');
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    const out = {};
    // import (single file; name is quoted in YAML)
    const act = await recorder.action('导入cn-all单文件', 'setInputFiles+click', 'variants/cn-all/SKILL.md', async () => {
      const f = await ensureList(page);
      await openImportDialog(f);
      out.imp = await setFileAndConfirm(f, variantFile);
    });
    const rRead = await recorder.read('卡片详情对象身份', 'card.detail.cn-all', {
      channel: 'dom', scope: '技能iframe/本轮cn-all卡片主体打开的详情', locator: '[class*="_page_"]',
    }, async () => {
      const f = await ensureList(page);
      const res = await findCardIndexByInternalName(f, TITLE, NAME);
      let raw = null;
      if (res.matched) {
        const cards = f.locator('[data-slot="card"]').filter({ hasText: TITLE });
        await cards.nth(res.index).locator('[data-slot="card-content"]').click({ timeout: 8000 }).catch(() => {});
        await sleep(1200);
        raw = await readDetail(f);
      }
      const value = !!(raw && raw.name === NAME);
      return { value, raw: { matched: res.matched, seen: res.seen, detail_name_raw: raw && raw.nameRaw, detail_name_normalized: raw && raw.name, expected: NAME }, derivation: "YAML name after stripping quotes equals round cn-all internal name" };
    });
    out.G13_10 = { action: act.event_id, read: rRead.event_id, value: rRead.value };
    return out;
  });
}
