// G12-02/G12-03: performance & usage display detail, real footer on a harmless reply, and restore.
import { withApp, sleep, newTask, selectProject, typeAndSend, waitTerminal } from '../../automation/tpt.mjs';
import { openSettings, openSection, closeSettings, readSelectorValue, setSelector, usageFooterText } from '../../automation/settings.mjs';

function classify(text) {
  const t = text ?? '';
  const round = /\d+\s*轮/.test(t);
  const step = /\d+\s*步/.test(t);
  const totalTok = /[\d.]+[KkMm]?\s*tok\b(?!\s*\/\s*s)/.test(t);
  const tokPerSec = /tok\s*\/\s*s/i.test(t);
  const percent = /\d+\s*%/.test(t);
  const detailedPresent = round || step || totalTok;
  const basicPresent = tokPerSec || percent;
  return { raw: t, round, step, totalTok, tokPerSec, percent, detailedPresent, basicPresent };
}

async function replyAndReadFooter(page, recorder, label) {
  await newTask(page);
  await selectProject(page).catch(() => {});
  await typeAndSend(page, '请在目录 D:\\code\\tpt-workspace\\.fast-assert-20261006-agent2 中读取 flow.txt 文件，然后只回复该文件内容。');
  const term = await waitTerminal(page, { timeout: 180000 });
  await sleep(2500);
  return recorder.read(label, 'usage.footer', {
    channel: 'dom', scope: '主任务视图/本轮回复性能页脚', locator: '[class*="TS9iAW_root"]',
  }, async () => {
    const text = await usageFooterText(page);
    const c = classify(text);
    return { value: text, raw: { ...c, terminal_ok: term.ok, ms: term.ms } };
  });
}

export async function settingsUsage(ctx, args) {
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    const out = {};
    await closeSettings(page);
    await openSettings(page);
    await openSection(page, '常规');
    const rInitial = await recorder.read('性能与用量设置初值', 'settings.usage', {
      channel: 'dom', scope: '设置/常规/性能与用量行', locator: '性能与用量 selector',
    }, async () => {
      const v = await readSelectorValue(page, '性能与用量');
      return { value: v, raw: { selector_text: v } };
    });
    out.initial = rInitial.value;

    // ---- 简洁 ----
    const actSimple = await recorder.action('切换用量为简洁', 'click+menuitem', '性能与用量=简洁', async () => {
      await setSelector(page, '性能与用量', '简洁');
    });
    await closeSettings(page);
    await openSettings(page);
    await openSection(page, '常规');
    const rSimpleSetting = await recorder.read('简洁档设置值', 'settings.usage.simple', {
      channel: 'dom', scope: '设置/常规/性能与用量行', locator: '性能与用量 selector',
    }, async () => {
      const v = await readSelectorValue(page, '性能与用量');
      return { value: v, raw: { selector_text: v } };
    });
    await closeSettings(page);
    const rSimpleFooter = await replyAndReadFooter(page, recorder, '简洁页脚');
    const sc = classify(rSimpleFooter.value);
    out.simple = { setting: rSimpleSetting.value, footer: rSimpleFooter.value, cls: sc };
    const rSimpleA1 = await recorder.read('简洁页脚轮次步骤token总量', 'usage.simple.detailed-hidden', {
      channel: 'derived', scope: '本轮回复性能页脚', locator: '[class*="TS9iAW"]',
    }, async () => {
      const c = classify(rSimpleFooter.value);
      return { value: !c.detailedPresent, raw: c, derivation: '!(round||step||totalTok)' };
    });
    const rSimpleA2 = await recorder.read('简洁页脚基本用量', 'usage.simple.basic-visible', {
      channel: 'derived', scope: '本轮回复性能页脚', locator: '[class*="TS9iAW"]',
    }, async () => {
      const c = classify(rSimpleFooter.value);
      return { value: c.basicPresent, raw: c, derivation: 'tokPerSec||percent' };
    });

    // ---- 详细 ----
    await openSettings(page);
    await openSection(page, '常规');
    const actDetailed = await recorder.action('切换用量为详细', 'click+menuitem', '性能与用量=详细', async () => {
      await setSelector(page, '性能与用量', '详细');
    });
    await closeSettings(page);
    const rDetailedFooter = await replyAndReadFooter(page, recorder, '详细页脚');
    out.detailed = { footer: rDetailedFooter.value };
    const rDetailedA1 = await recorder.read('详细页脚字段', 'usage.detailed.all-visible', {
      channel: 'derived', scope: '本轮回复性能页脚', locator: '[class*="TS9iAW"]',
    }, async () => {
      const c = classify(rDetailedFooter.value);
      return { value: c.round && c.step && c.totalTok, raw: c, derivation: 'round&&step&&totalTok' };
    });

    // ---- restore ----
    await openSettings(page);
    await openSection(page, '常规');
    const actRestore = await recorder.action('恢复用量初值', 'click+menuitem', '性能与用量=' + rInitial.value, async () => {
      await setSelector(page, '性能与用量', rInitial.value);
    });
    await closeSettings(page);
    await openSettings(page);
    await openSection(page, '常规');
    const rRestored = await recorder.read('恢复后的用量设置', 'settings.usage.restored', {
      channel: 'dom', scope: '设置/常规/性能与用量行', locator: '性能与用量 selector',
    }, async () => {
      const v = await readSelectorValue(page, '性能与用量');
      return { value: v, raw: { selector_text: v } };
    });
    await closeSettings(page);
    out.restored = rRestored.value;

    out.reads = {
      initial: rInitial.event_id, simpleSetting: rSimpleSetting.event_id, simpleFooter: rSimpleFooter.event_id,
      detailedFooter: rDetailedFooter.event_id, restored: rRestored.event_id,
      simpleA1: rSimpleA1.event_id, simpleA2: rSimpleA2.event_id, detailedA1: rDetailedA1.event_id,
    };
    out.actions = { simple: actSimple.event_id, detailed: actDetailed.event_id, restore: actRestore.event_id };
    out.detailFlags = { detailedPresent: classify(rDetailedFooter.value).detailedPresent };
    return out;
  });
}
