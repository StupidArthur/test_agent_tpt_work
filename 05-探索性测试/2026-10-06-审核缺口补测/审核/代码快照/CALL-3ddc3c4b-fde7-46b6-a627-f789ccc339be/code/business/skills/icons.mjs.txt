// G9-12/G9-13/G9-14 icon packages + G13-10 card body opens detail.
import path from 'node:path';
import fs from 'node:fs';
import { withApp, sleep } from '../../automation/tpt.mjs';
import { ensureList, openImportDialog, setFileAndConfirm, findCardIndexByInternalName, cardByTitle, skillDirNames } from '../../automation/skills.mjs';

const SKILLS_DIR = 'C:\\Users\\Administrator\\.tpt-work\\dsh\\skills';

async function importPkg(page, zipPath) {
  const f = await ensureList(page);
  await openImportDialog(f);
  return setFileAndConfirm(f, zipPath);
}

async function readCardIcon(frame, title, index) {
  return frame.evaluate(({ title, index }) => {
    const cards = [...document.querySelectorAll('[data-slot="card"]')].filter((c) => (c.innerText || '').includes(title));
    const c = cards[index];
    if (!c) return null;
    const img = c.querySelector('img');
    const svg = c.querySelector('svg');
    return {
      hasImg: !!img,
      complete: img ? img.complete : null,
      naturalWidth: img ? img.naturalWidth : null,
      src: img ? (img.currentSrc || img.getAttribute('src')) : null,
      hasSvg: !!svg,
    };
  }, { title, index });
}

export async function skillsIcons(ctx, args) {
  const run = ctx.runtime.extension_run;
  const zips = path.join(ctx.taskRoot, '夹具', '本轮', run, 'zips');
  const variants = path.join(ctx.taskRoot, '夹具', '本轮', run, 'variants');
  return withApp(ctx, async (page) => {
    const { recorder } = ctx;
    const out = {};

    // ---------- G9-12 rich PNG ----------
    const richName = 'fast-assert-rich-' + run;
    const a12 = await recorder.action('导入rich.zip', 'setInputFiles+click', 'zips/rich.zip', async () => { out.rich = await importPkg(page, path.join(zips, 'rich.zip')); });
    const r12icon = await recorder.read('rich包图标加载', 'rich.icon.load', {
      channel: 'dom', scope: '技能iframe/本轮rich卡片图标', locator: '[data-slot="card"] img',
    }, async () => {
      const f = await ensureList(page);
      const res = await findCardIndexByInternalName(f, richName, richName);
      const info = res.matched ? await readCardIcon(f, richName, res.index) : null;
      const value = !!(info && info.hasImg && info.complete && info.naturalWidth > 0);
      return { value, raw: { matched: res.matched, info, seen: res.seen }, derivation: 'card img.complete && naturalWidth>0' };
    });
    const r12src = await recorder.read('rich图标资源来自该安装包', 'rich.icon.source', {
      channel: 'derived', scope: '本轮rich安装目录与图标src', locator: SKILLS_DIR,
    }, async () => {
      const dir = path.join(SKILLS_DIR, richName);
      const iconPath = path.join(dir, 'assets', 'icon.png');
      const f = await ensureList(page);
      const res = await findCardIndexByInternalName(f, richName, richName);
      const info = res.matched ? await readCardIcon(f, richName, res.index) : null;
      const src = info && info.src;
      const dirExists = fs.existsSync(iconPath);
      const srcIsBlob = typeof src === 'string' && src.startsWith('blob:');
      const srcMentions = typeof src === 'string' && (src.includes(richName) || src.includes('.tpt-work'));
      const value = dirExists && !!src && srcMentions;
      return { value, raw: { icon_path: iconPath, dir_exists: dirExists, src, src_is_blob: srcIsBlob, src_mentions_install: srcMentions }, derivation: 'install has assets/icon.png and img src references the install identity' };
    });

    // ---------- G9-13 missing icon ----------
    const miName = 'fast-assert-missing-icon-' + run;
    const a13 = await recorder.action('导入missing-icon.zip', 'setInputFiles+click', 'zips/missing-icon.zip', async () => { out.mi = await importPkg(page, path.join(zips, 'missing-icon.zip')); });
    const r13a = await recorder.read('缺图标包存在', 'missingicon.exists', {
      channel: 'dom', scope: '技能iframe/我的技能列表', locator: '[data-slot="card"]',
    }, async () => {
      const f = await ensureList(page);
      const res = await findCardIndexByInternalName(f, miName, miName);
      return { value: res.matched, raw: { matched: res.matched, seen: res.seen, dir_exists: fs.existsSync(path.join(SKILLS_DIR, miName)) }, derivation: 'detail internal name equals ' + miName };
    });
    const r13b = await recorder.read('缺图标包降级图标', 'missingicon.fallback', {
      channel: 'dom', scope: '技能iframe/本轮缺图标卡片图标区', locator: '[data-slot="card"] img/svg',
    }, async () => {
      const f = await ensureList(page);
      const res = await findCardIndexByInternalName(f, miName, miName);
      const info = res.matched ? await readCardIcon(f, miName, res.index) : null;
      const broken = !!(info && info.hasImg && (!info.complete || info.naturalWidth === 0));
      const value = !!(info && (info.hasSvg || !info.hasImg) && !broken);
      return { value, raw: { matched: res.matched, info }, derivation: 'default icon (svg or no img) shown and no broken img' };
    });

    // ---------- G9-14 bad png ----------
    const bpName = 'fast-assert-bad-png-' + run;
    const a14 = await recorder.action('导入bad-png.zip', 'setInputFiles+click', 'zips/bad-png.zip', async () => { out.bp = await importPkg(page, path.join(zips, 'bad-png.zip')); });
    const r14a = await recorder.read('伪PNG被作为有效图像', 'badpng.valid', {
      channel: 'dom', scope: '技能iframe/本轮伪PNG卡片图标', locator: '[data-slot="card"] img',
    }, async () => {
      const f = await ensureList(page);
      const res = await findCardIndexByInternalName(f, bpName, bpName);
      const info = res.matched ? await readCardIcon(f, bpName, res.index) : null;
      // value true only if img src is the package fake png AND loaded
      const srcIsFake = typeof (info && info.src) === 'string' && info.src.includes(bpName);
      const value = !!(info && info.hasImg && info.complete && info.naturalWidth > 0 && srcIsFake);
      return { value, raw: { matched: res.matched, info, src_is_package: srcIsFake }, derivation: 'img loads and src references the bad-png package asset' };
    });
    const r14b = await recorder.read('伪PNG默认图标降级', 'badpng.fallback', {
      channel: 'dom', scope: '技能iframe/本轮伪PNG卡片图标区', locator: '[data-slot="card"] img/svg',
    }, async () => {
      const f = await ensureList(page);
      const res = await findCardIndexByInternalName(f, bpName, bpName);
      const info = res.matched ? await readCardIcon(f, bpName, res.index) : null;
      const srcIsProduct = !info || !info.hasImg || !(typeof info.src === 'string' && info.src.includes(bpName));
      const broken = !!(info && info.hasImg && (!info.complete || info.naturalWidth === 0));
      const value = !!info && info.hasSvg && !broken && srcIsProduct;
      return { value, raw: { matched: res.matched, info }, derivation: 'product default icon shown (svg present, src not package bad png, no broken img)' };
    });

    // ---------- G13-10 card body opens detail ----------
    const cnName = 'fast-assert-cn-all-' + run;
    const a10 = await recorder.action('导入cn-all目录', 'setInputFiles+click', 'variants/cn-all', async () => {
      const f = await ensureList(page);
      await openImportDialog(f);
      out.cn = await setFileAndConfirm(f, path.join(variants, 'cn-all'), { directory: true });
    });
    const r10 = await recorder.read('卡片详情对象身份', 'card.detail.cn-all', {
      channel: 'dom', scope: '技能iframe/本轮cn-all卡片主体打开的详情', locator: '[class*="_page_"]',
    }, async () => {
      const f = await ensureList(page);
      const res = await findCardIndexByInternalName(f, cnName, cnName);
      // open detail via card content and read raw name per YAML semantics
      let name = null;
      if (res.matched) {
        const cards = f.locator('[data-slot="card"]').filter({ hasText: cnName });
        await cards.nth(res.index).locator('[data-slot="card-content"]').click({ timeout: 8000 }).catch(() => {});
        await sleep(1200);
        name = await f.evaluate(() => {
          const p = document.querySelector('[class*="_page_"]');
          const m = p && (p.innerText.match(/name:\s*([^\s]+)/) || [])[1];
          return m ? m.replace(/^["']|["']$/g, '') : null;
        });
      }
      const value = name === cnName;
      return { value, raw: { matched: res.matched, detail_name: name, expected: cnName }, derivation: 'YAML name field after stripping quotes equals round cn-all internal name' };
    });

    out.G9_12 = { action: a12.event_id, iconRead: r12icon.event_id, icon: r12icon.value, srcRead: r12src.event_id, src: r12src.value };
    out.G9_13 = { action: a13.event_id, existsRead: r13a.event_id, exists: r13a.value, fallbackRead: r13b.event_id, fallback: r13b.value };
    out.G9_14 = { action: a14.event_id, validRead: r14a.event_id, valid: r14a.value, fallbackRead: r14b.event_id, fallback: r14b.value };
    out.G13_10 = { action: a10.event_id, read: r10.event_id, value: r10.value };
    return out;
  });
}
