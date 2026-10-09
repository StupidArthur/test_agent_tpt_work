// Batch A: G8-07 long tool output scroll; G8-10 single-read aggregation nesting.
import { withApp, sleep, newTask, selectProject, typeAndSend, waitTerminal } from '../../automation/tpt.mjs';

async function expandLastToolView(page) {
  await page.evaluate(() => {
    const views = [...document.querySelectorAll('[data-slot="tool.call.toolview"]')];
    const v = views[views.length - 1];
    const t = v && v.querySelector('[aria-expanded="false"]');
    if (t) t.click();
  });
  await sleep(2000);
}

export async function batchTrace(ctx, args) {
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    const out = {};

    // ---------- G8-07 long read ----------
    await newTask(page);
    await selectProject(page).catch(() => {});
    const act7 = await recorder.action('发起长行文件读取', 'fill+click', '读取 long.txt', async () => {
      await typeAndSend(page, '请在目录 D:\\code\\tpt-workspace\\.fast-assert-20261006-agent2 中读取 long.txt 文件，然后只回复该文件最后一行的内容。');
      await waitTerminal(page, { timeout: 180000 });
      await sleep(1500);
    });
    await expandLastToolView(page);
    const rScroll = await recorder.read('工具输出内部滚动', 'tool.output.container', {
      channel: 'derived', scope: '本轮最后一个成功read工具步骤/输出容器', locator: '[class*="readBody"], [class*="_body_u1jhm_157"]',
    }, async () => {
      const raw = await page.evaluate(() => {
        const views = [...document.querySelectorAll('[data-slot="tool.call.toolview"]')];
        const v = views[views.length - 1];
        if (!v) return null;
        const body = v.querySelector('[class*="readBody"]') || v.querySelector('[class*="_body_u1jhm_157"]');
        if (!body) return { found: false };
        const cs = getComputedStyle(body);
        return { found: true, scrollHeight: body.scrollHeight, clientHeight: body.clientHeight, overflowY: cs.overflowY, maxHeight: cs.maxHeight };
      });
      if (!raw || !raw.found) return { value: null, raw, reason: '未定位到工具输出容器' };
      const value = raw.scrollHeight > raw.clientHeight && /auto|scroll/.test(raw.overflowY);
      return { value, raw, derivation: 'scrollHeight>clientHeight && overflowY auto|scroll' };
    });
    const rOutput = await recorder.read('实际read输出末行', 'tool.output.text', {
      channel: 'dom', scope: '本轮最后一个成功read工具步骤/完整输出', locator: '[class*="readBody"], [class*="_body_u1jhm_157"]',
    }, async () => {
      const text = await page.evaluate(() => {
        const views = [...document.querySelectorAll('[data-slot="tool.call.toolview"]')];
        const v = views[views.length - 1];
        if (!v) return null;
        const body = v.querySelector('[class*="readBody"]') || v.querySelector('[class*="_body_u1jhm_157"]');
        return body ? (body.textContent || '') : null;
      });
      if (text === null) return { value: null, raw: null, reason: '未定位到工具输出容器' };
      return { value: text, raw: { length: text.length, has200: text.includes('FAST_LONG_LINE_200') }, derivation: 'full tool read output text' };
    });
    out.G8_07 = { action: act7.event_id, scrollRead: rScroll.event_id, scroll: rScroll.value, outputRead: rOutput.event_id, outputHas200: /FAST_LONG_LINE_200/.test(rOutput.value || '') };

    // ---------- G8-10 single read nesting ----------
    await newTask(page);
    await selectProject(page).catch(() => {});
    const act10 = await recorder.action('单次读取flow.txt', 'fill+click', '单次read', async () => {
      await typeAndSend(page, '请在目录 D:\\code\\tpt-workspace\\.fast-assert-20261006-agent2 中读取 flow.txt 文件，然后只回复该文件内容。');
      await waitTerminal(page, { timeout: 180000 });
      await sleep(1800);
    });
    const rNest = await recorder.read('单read多层聚合', 'tool.single.nesting', {
      channel: 'dom', scope: '本次单次read工具记录/父子节点', locator: '[data-slot="tool.call.toolview"], [data-disclosure-row]',
    }, async () => {
      const raw = await page.evaluate(() => {
        const views = [...document.querySelectorAll('[data-slot="tool.call.toolview"]')];
        const nestedToolViews = views.filter((v) => v.querySelector('[data-slot="tool.call.toolview"]')).length;
        const rows = [...document.querySelectorAll('[data-disclosure-row="true"]')];
        let maxDepth = 0;
        for (const r of rows) {
          let d = 0; let el = r.parentElement;
          while (el) { if (el.querySelector && el.querySelector(':scope > [data-disclosure-row="true"]')) d++; el = el.parentElement; if (d > 10) break; }
          maxDepth = Math.max(maxDepth, d);
        }
        const groupRows = [...document.querySelectorAll('[class*="_group_"], [data-group], [class*="groupRow"]')];
        return { view_count: views.length, nested_tool_views: nestedToolViews, disclosure_rows: rows.length, max_disclosure_depth: maxDepth, group_like: groupRows.length };
      });
      // at least two layers of same-type aggregation nesting
      const value = raw.nested_tool_views > 0 || raw.max_disclosure_depth >= 2;
      return { value, raw, derivation: 'nested tool views > 0 or disclosure depth >= 2' };
    });
    out.G8_10 = { action: act10.event_id, nestRead: rNest.event_id, nest: rNest.value };
    return out;
  });
}
