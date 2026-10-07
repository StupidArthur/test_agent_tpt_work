// Batch A: G10-03 rich directory tree collapse/expand; G10-05 rich packaged image preview.
import path from 'node:path';
import { withApp, sleep } from '../../automation/tpt.mjs';
import { ensureList, findCardIndexByInternalName, cardByTitle } from '../../automation/skills.mjs';

const RICH = 'fast-assert-rich-20261006-agent2';

export async function batchRichDetail(ctx, args) {
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    const out = {};

    const clickTree = async (text) => { await page.evaluate((t) => { const f = [...document.querySelectorAll('iframe')]; }, text); };
    // operate inside the skills iframe
    const f = await ensureList(page);
    const openRich = async () => {
      const frame = await ensureList(page);
      const res = await findCardIndexByInternalName(frame, RICH, RICH);
      if (!res.matched) return false;
      const cards = frame.locator('[data-slot="card"]').filter({ hasText: RICH });
      await cards.nth(res.index).locator('[data-slot="card-content"]').click({ timeout: 8000 }).catch(() => {});
      await sleep(1500);
      return true;
    };
    const clickTreeIn = async (text) => { await f.evaluate((t) => { const p = document.querySelector('[class*="_page_"]'); if (!p) return; const leaf = [...p.querySelectorAll('*')].find((e) => e.children.length === 0 && (e.textContent || '').trim() === t); if (leaf) (leaf.closest('button,[role="treeitem"],[class*="node"],[class*="item"]') || leaf).click(); }, text); await sleep(1000); };
    const nodeVisible = (text) => f.evaluate((t) => { const p = document.querySelector('[class*="_page_"]'); if (!p) return null; const leaf = [...p.querySelectorAll('*')].find((e) => e.children.length === 0 && (e.textContent || '').trim() === t); return leaf ? !!(leaf.offsetWidth || leaf.offsetHeight) : false; }, text);

    await recorder.action('打开rich技能详情', 'click', 'rich卡片主体', async () => { out.opened = await openRich(); });

    // G10-03 collapse/expand
    await recorder.action('展开references到checklist.md', 'click', 'references/handbook/advanced/checklist.md', async () => {
      await clickTreeIn('references'); await clickTreeIn('handbook'); await clickTreeIn('advanced');
    });
    const rExpanded0 = await recorder.read('展开后深层节点可见', 'rich.tree.expanded.initial', {
      channel: 'dom', scope: 'rich详情/文件树', locator: 'checklist.md node',
    }, async () => ({ value: await nodeVisible('checklist.md'), raw: { visible: await nodeVisible('checklist.md') }, derivation: 'checklist.md tree node offsetWidth>0' }));
    await recorder.action('收起references', 'click', 'references', async () => { await clickTreeIn('references'); });
    const rCollapsed = await recorder.read('收起后的深层节点可见', 'rich.tree.collapsed', {
      channel: 'dom', scope: 'rich详情/文件树', locator: 'checklist.md node',
    }, async () => {
      const raw = await f.evaluate(() => {
        const p = document.querySelector('[class*="_page_"]');
        if (!p) return null;
        const inTree = [...p.querySelectorAll('[class*="tree"],[class*="dir"],[class*="fileTree"],[role="tree"] *')];
        const leaf = [...p.querySelectorAll('*')].find((e) => e.children.length === 0 && (e.textContent || '').trim() === 'checklist.md');
        return { visible: leaf ? !!(leaf.offsetWidth || leaf.offsetHeight) : false, previewTitlePresent: /checklist\.md/.test(p.innerText) };
      });
      return { value: raw ? raw.visible : null, raw, derivation: 'checklist.md tree node visible after collapsing references' };
    });
    await recorder.action('重新展开references', 'click', 'references', async () => { await clickTreeIn('references'); });
    const rExpanded1 = await recorder.read('恢复展开深层节点可见', 'rich.tree.expanded.restored', {
      channel: 'dom', scope: 'rich详情/文件树', locator: 'checklist.md node',
    }, async () => ({ value: await nodeVisible('checklist.md'), raw: { visible: await nodeVisible('checklist.md') }, derivation: 'checklist.md tree node visible after re-expanding' }));

    // G10-05 image preview: click assets/icon.png then read preview img
    await recorder.action('点击assets/icon.png图片样本', 'click', 'assets/icon.png', async () => {
      await clickTreeIn('assets');
      await clickTreeIn('icon.png');
      await sleep(1200);
    });
    const rPreview = await recorder.read('包内图片预览加载', 'rich.preview.img', {
      channel: 'dom', scope: 'rich详情/图片预览区', locator: '[class*="_page_"] img',
    }, async () => {
      const raw = await f.evaluate(() => {
        const p = document.querySelector('[class*="_page_"]');
        if (!p) return null;
        const imgs = [...p.querySelectorAll('img')].map((im) => ({ src: (im.currentSrc || im.getAttribute('src') || '').slice(0, 120), complete: im.complete, nw: im.naturalWidth, nh: im.naturalHeight, parentCls: (im.parentElement && im.parentElement.className || '').toString().slice(0, 50) }));
        return { imgs };
      });
      if (!raw) return { value: null, raw: null, reason: 'rich detail not open' };
      const loaded = raw.imgs.filter((i) => i.complete && i.nw > 0 && !/data:image\/svg/i.test(i.src));
      const preview = loaded.sort((a, b) => b.nw - a.nw)[0] || null;
      return { value: !!preview, raw: { imgs: raw.imgs, chosen: preview }, derivation: 'a non-svg preview img complete && naturalWidth>0' };
    });

    out.G10_03 = { opened: rExpanded0.event_id, collapsed: rCollapsed.event_id, collapsedValue: rCollapsed.value, expanded: rExpanded1.event_id, expandedValue: rExpanded1.value };
    out.G10_05 = { preview: rPreview.event_id, value: rPreview.value };
    return out;
  });
}
