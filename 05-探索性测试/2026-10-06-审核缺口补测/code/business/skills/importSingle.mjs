// G2-02/G2-03/G3-01: single-file skill import, displayed title, default enabled state.
import path from 'node:path';
import { withApp } from '../../automation/tpt.mjs';
import {
  ensureList, openImportDialog, setFileAndConfirm, dialogInfo,
  findCardIndexByInternalName, cardByTitle, skillDirNames, skillDirExists,
} from '../../automation/skills.mjs';

export async function skillsImportSingle(ctx, args) {
  const run = ctx.runtime.extension_run;
  const base = path.join(ctx.taskRoot, '夹具', '基础', run);
  const mainName = args.mainName ?? 'fast-assert-skill-' + run;
  const mainTitle = args.mainTitle ?? '本轮快速回归技能';
  const defaultName = args.defaultName ?? 'fast-assert-default-' + run;
  const defaultTitle = args.defaultTitle ?? '本轮默认态技能';
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    const out = {};

    // ---- G2-02 fresh single-file import ----
    const preCheck = await recorder.read('导入前技能身份集合', 'skills.dir.before', {
      channel: 'file', scope: '技能安装目录', locator: 'C:\\Users\\Administrator\\.tpt-work\\dsh\\skills',
    }, async () => {
      const names = skillDirNames();
      const raw = { count: names.length, main_present: names.includes(mainName) };
      return { value: raw.main_present, raw, derivation: 'names.includes(mainName)' };
    });
    const importAction = await recorder.action('提交单文件技能导入', 'setInputFiles+click', '夹具/基础/' + run + '/skill-c/SKILL.md', async () => {
      const f = await ensureList(page);
      await openImportDialog(f);
      const r = await setFileAndConfirm(f, path.join(base, 'skill-c', 'SKILL.md'));
      out.importResult = r;
    });
    const postImportDialog = await recorder.read('导入反馈原文', 'skills.import.dialog', {
      channel: 'dom', scope: '技能iframe/导入弹窗', locator: '[role="dialog"]',
    }, async () => {
      const info = await dialogInfo(await ensureList(page));
      return { value: info.text, raw: info };
    });
    const readExists = await recorder.read('本轮技能卡', mainName, {
      channel: 'dom', scope: '技能iframe/我的技能列表', locator: '[data-slot="card"]',
    }, async () => {
      const f = await ensureList(page);
      const res = await findCardIndexByInternalName(f, mainTitle, mainName);
      const raw = { matched: res.matched, seen_internal_names: res.seen, dir_exists: skillDirExists(mainName) };
      return { value: res.matched, raw, derivation: 'detail internal name equals ' + mainName };
    });

    // ---- G2-03 displayed title bound to internal name ----
    const readTitle = await recorder.read('本轮技能标题', mainName, {
      channel: 'dom', scope: '技能iframe/我的技能列表/本轮卡片标题', locator: '[data-slot="card"] h3',
    }, async () => {
      const f = await ensureList(page);
      const res = await findCardIndexByInternalName(f, mainTitle, mainName);
      let title = null;
      if (res.matched) {
        const card = (await cardByTitle(f, mainTitle)).nth(res.index);
        title = (await card.locator('h3').first().innerText().catch(() => '')).trim();
      }
      return { value: title, raw: { title, matched: res.matched, seen: res.seen } };
    });

    // ---- G3-01 default enabled state of a freshly imported skill, before any toggle ----
    const defaultImportAction = await recorder.action('提交默认态技能导入', 'setInputFiles+click', '夹具/基础/' + run + '/skill-default/SKILL.md', async () => {
      const f = await ensureList(page);
      await openImportDialog(f);
      const r = await setFileAndConfirm(f, path.join(base, 'skill-default', 'SKILL.md'));
      out.defaultImport = r;
    });
    const readDefaultSwitch = await recorder.read('刚导入技能开关', defaultName, {
      channel: 'dom', scope: '技能iframe/我的技能列表/默认态技能卡片开关', locator: '[data-slot="card"] [role="switch"]',
    }, async () => {
      const f = await ensureList(page);
      const res = await findCardIndexByInternalName(f, defaultTitle, defaultName);
      let checked = null;
      if (res.matched) {
        const sw = (await cardByTitle(f, defaultTitle)).nth(res.index).locator('[role="switch"]').first();
        checked = await sw.getAttribute('aria-checked');
      }
      const raw = { aria_checked: checked, matched: res.matched, seen: res.seen };
      return { value: checked === 'true', raw, derivation: "aria_checked === 'true'" };
    });

    out.G2_02 = { importAction: importAction.event_id, dialogRead: postImportDialog.event_id, existsRead: readExists.event_id, exists: readExists.value, preCheck: preCheck.event_id };
    out.G2_03 = { titleRead: readTitle.event_id, title: readTitle.value };
    out.G3_01 = { defaultImportAction: defaultImportAction.event_id, defaultRead: readDefaultSwitch.event_id, checked: readDefaultSwitch.value };
    out.mainName = mainName;
    out.defaultName = defaultName;
    return out;
  });
}
