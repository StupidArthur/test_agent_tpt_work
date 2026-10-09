import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { withApp, sleep, root, environmentId, evidenceFor, finalizeCase, fixtureRoot, skillsFrame, closeSettings, newTask, waitTerminal, lastAssistantText, SEL, openSettings } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G9';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, locatorOrFn, fnOr) => { const locator = typeof locatorOrFn === 'function' ? scope : locatorOrFn; const fn = typeof locatorOrFn === 'function' ? locatorOrFn : fnOr; return log.read(target, object_id, { channel: 'dom', scope, locator }, fn); };
const FR = (target, object_id, scope, locator, fn) => log.read(target, object_id, { channel: 'file', scope, locator }, fn);
const VAR = p => path.join(fixtureRoot, 'variants', p, 'SKILL.md');
const ZIP = n => path.join(fixtureRoot, 'zips', n);
const SKILLS_DIR = 'C:\\Users\\Administrator\\.tpt-work\\dsh\\skills';
const REG = 'C:\\Users\\Administrator\\.tpt-work\\dsh\\skills-manager\\skill-registry.json';
const out = {};

await withApp(async (page) => {
  const scope = '技能iframe/supcon-skills';
  await closeSettings(page);
  // restore UI language to Chinese if a prior interrupted run left English
  await openSettings(page);
  const langSel = page.locator('button[class*="hVGvvW_selector"]').first();
  const curLang = await langSel.innerText().catch(() => '');
  if (!/中文/.test(curLang)) { await langSel.click({ timeout: 6000 }).catch(() => {}); await sleep(600); await page.getByText('中文', { exact: true }).last().click({ timeout: 5000 }).catch(() => {}); await sleep(1200); }
  await closeSettings(page);
  let f = await skillsFrame(page);
  const refresh = async () => { f = await skillsFrame(page); };
  const back = async () => { for (let i = 0; i < 3; i++) { const d = await f.evaluate(() => !!document.querySelector('[class*="_page_"]')); if (!d) return; await f.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); const b = p && [...p.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '技能'); if (b) b.click(); }); await sleep(800); } };
  const closeDialogs = async () => { for (let i = 0; i < 4; i++) { const has = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some(e => e.offsetWidth)); if (!has) break; await f.getByRole('button', { name: '取消', exact: true }).first().click({ timeout: 3000 }).catch(() => {}); await page.keyboard.press('Escape').catch(() => {}); await sleep(400); } };
  const setSearch = async (t) => { const b = f.locator('input[placeholder="搜索技能名称或描述"]').first(); await b.click({ timeout: 5000 }).catch(() => {}); await b.fill(t); await sleep(1100); };
  const importFile = async (file) => {
    await back(); await closeDialogs();
    await f.getByRole('button', { name: '导入技能', exact: true }).click({ timeout: 8000 });
    await sleep(1000);
    await f.locator('input[type="file"]').first().setInputFiles(file);
    await sleep(800);
    await f.getByRole('button', { name: '导入', exact: true }).click({ timeout: 8000 });
    await sleep(2500);
    const overwrite = f.getByRole('button', { name: '覆盖现有', exact: true });
    if (await overwrite.count()) { await overwrite.click({ timeout: 5000 }).catch(() => {}); await sleep(2000); }
    const dlg = await f.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); return d ? d.innerText.replace(/\s+/g, ' ') : '(closed)'; });
    const open = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some(e => e.offsetWidth));
    await closeDialogs();
    return { dlg, open };
  };
  const variantRead = async (name) => {
    await back(); await setSearch(name);
    const cards = f.locator('[data-slot="card"]');
    const n = await cards.count();
    let title = null, desc = null, detailName = null, detailTitle = null, detailDesc = null;
    if (n) {
      const card = cards.first();
      title = (await card.locator('h3').first().innerText().catch(() => '')).trim();
      desc = (await card.innerText()).replace(/\s+/g, ' ').trim();
      await card.locator('[data-slot="card-content"]').click({ timeout: 6000 }).catch(() => {});
      await sleep(1100);
      const d = await f.evaluate(() => {
        const p = document.querySelector('[class*="_page_"]'); if (!p) return null;
        const t = p.innerText; const lines = t.split('\n').map(s => s.trim()).filter(Boolean);
        const i = lines.indexOf('详情');
        return { name: (t.match(/name:\s*([^\s]+)/) || [])[1] || null, title: i >= 0 ? lines[i + 1] : null, desc: i >= 0 ? lines[i + 2] : null, text: t };
      });
      if (d) { detailName = d.name; detailTitle = d.title; detailDesc = d.desc; }
      await back();
    }
    await setSearch('');
    return { n, title, desc, detailName, detailTitle, detailDesc };
  };
  const registryKeys = () => { const j = JSON.parse(fs.readFileSync(REG, 'utf8')); return Object.keys(j.entries).sort(); };

  // G9-01..06 variants
  const variants = [
    ['G9-01', 'cn-all', 'fast-assert-cn-all-20261006-oc1'],
    ['G9-02', 'cn-en', 'fast-assert-cn-en-20261006-oc1'],
    ['G9-03', 'cn-tech', 'fast-assert-cn-tech-20261006-oc1'],
    ['G9-05', 'desc-en', 'fast-assert-desc-en-20261006-oc1'],
    ['G9-06', 'desc-tech', 'fast-assert-desc-tech-20261006-oc1'],
  ];
  const reads = {};
  for (const [id, dir, name] of variants) {
    await A('导入' + dir, 'setInputFiles+click', dir, () => importFile(VAR(dir)));
    reads[id] = await R((id === 'G9-05' || id === 'G9-06') ? '本轮样本描述' : '本轮样本标题', id + '.field', scope + '/搜索结果', 'card/detail', async () => { const r = await variantRead(name); const val = (id === 'G9-05' || id === 'G9-06') ? r.detailDesc : (r.detailTitle || r.title); return { value: val, raw: { count: r.n, cardTitle: r.title, detailTitle: r.detailTitle, detailDesc: r.detailDesc, detailName: r.detailName } }; });
  }
  // G9-04 en-cn with English UI
  await A('导入en-cn', 'setInputFiles+click', 'en-cn', () => importFile(VAR('en-cn')));
  await A('切换语言为English', 'click', 'English', async () => { await openSettings(page); await page.locator('button[class*="hVGvvW_selector"]').first().click({ timeout: 6000 }); await sleep(600); await page.getByText('English', { exact: true }).last().click({ timeout: 5000 }); await sleep(1500); await closeSettings(page); });
  reads['G9-04'] = await R('本轮样本标题', 'G9-04.title', scope + '/搜索结果', 'card/detail', async () => { const r = await variantRead('fast-assert-en-cn-20261006-oc1'); return { value: r.detailTitle || r.title, raw: { count: r.n, cardTitle: r.title, detailTitle: r.detailTitle, detailName: r.detailName } }; });
  await A('恢复语言为中文', 'click', '中文', async () => { await openSettings(page); await page.locator('button[class*="hVGvvW_selector"]').first().click({ timeout: 6000 }); await sleep(600); await page.getByText('中文', { exact: true }).last().click({ timeout: 5000 }); await sleep(1500); await closeSettings(page); });

  // G9-07/08 missing required
  const keysBefore7 = registryKeys();
  const rKeys7Before = await FR('技能列表内部身份集合', 'skills.registry.before7', '技能注册表', REG, () => ({ value: registryKeys() }));
  const imp7 = { dlg: '', open: false }; await A('导入missing-name', 'setInputFiles+click', 'missing-name', async () => { const r = await importFile(VAR('missing-name')); imp7.dlg = r.dlg; imp7.open = r.open; });
  const r7a = await R('缺name导入反馈', 'import.missing.name', '导入弹窗', 'dialog', async () => { return { value: (imp7.open === true) || /缺少|无效|校验|失败|必须|必填|name/.test(imp7.dlg), raw: { dialog: imp7.dlg.slice(0, 200), open: imp7.open }, derivation: 'dialog stayed open or shows validation error' }; });
  const rKeys7After = await FR('技能列表内部身份集合', 'skills.registry.before7', '技能注册表', REG, () => ({ value: registryKeys() }));

  const keysBefore8 = registryKeys();
  const rKeys8Before = await FR('技能列表内部身份集合', 'skills.registry.before8', '技能注册表', REG, () => ({ value: registryKeys() }));
  const imp8 = { dlg: '', open: false }; await A('导入missing-description', 'setInputFiles+click', 'missing-description', async () => { const r = await importFile(VAR('missing-description')); imp8.dlg = r.dlg; imp8.open = r.open; });
  const r8a = await R('缺description导入反馈', 'import.missing.description', '导入弹窗', 'dialog', async () => { return { value: (imp8.open === true) || /缺少|无效|校验|失败|必须|必填|description/.test(imp8.dlg), raw: { dialog: imp8.dlg.slice(0, 200), open: imp8.open }, derivation: 'dialog stayed open or shows validation error' }; });
  const rKeys8After = await FR('技能列表内部身份集合', 'skills.registry.before8', '技能注册表', REG, () => ({ value: registryKeys() }));

  // G9-09 minimal detail
  await A('导入minimal', 'setInputFiles+click', 'minimal', () => importFile(VAR('minimal')));
  await back(); await setSearch('fast-assert-minimal-20261006-oc1');
  await f.locator('[data-slot="card"]').first().locator('[data-slot="card-content"]').click({ timeout: 6000 }).catch(() => {});
  await sleep(1200);
  const r9 = await R('空可选字段占位', 'minimal.detail.emptyfields', scope + '/详情', 'detail', async () => {
    const t = await f.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); return p ? p.innerText : ''; });
    const emptyRows = /(版本|作者|标签|推荐问题)\s*\n\s*(\n|$)/.test(t);
    return { value: emptyRows, raw: { detail: t.slice(0, 600) }, derivation: 'an optional field label with empty value row present' };
  });
  await back(); await setSearch('');

  // G9-10 use minimal
  await A('启用minimal技能', 'click', 'switch', async () => { await back(); await setSearch('fast-assert-minimal-20261006-oc1'); const sw = f.locator('[data-slot="card"]').first().locator('[role="switch"]').first(); if ((await sw.getAttribute('aria-checked')) !== 'true') await sw.click({ timeout: 5000 }); await sleep(1200); await setSearch(''); });
  await closeSettings(page);
  await A('新建会话并调用minimal', 'type+click', 'minimal', async () => { await newTask(page); const c = page.locator(SEL.composer).first(); await c.click({ timeout: 8000 }); await page.keyboard.type('/fast-assert-minimal-20261006-oc1 '); await sleep(400); await page.keyboard.type('请执行此技能固定回复规则'); await sleep(400); const send = page.locator(SEL.send).first(); for (let i = 0; i < 30; i++) { if (!(await send.isDisabled().catch(() => true))) break; await sleep(300); } await send.click({ timeout: 8000 }); });
  const term10 = await waitTerminal(page, { expect: 'FAST_MINIMAL_OK', timeout: 120000 });
  const r10a = await R('minimal助手正文', 'minimal.reply', '主任务视图/助手正文', SEL.assistant, async () => ({ value: (await lastAssistantText(page)).trim(), raw: { terminalOk: term10.ok, ms: term10.ms } }));
  const r10b = await R('用户请求含输出串', 'minimal.user', '用户请求元素', 'leaf with request', async () => { const t = await page.evaluate(() => [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent || '').includes('请执行此技能固定回复规则')).map(e => e.textContent.trim())[0] || ''); return { value: t.includes('FAST_MINIMAL_OK'), raw: { userText: t }, derivation: 'user request element contains FAST_MINIMAL_OK' }; });
  await A('停用minimal技能', 'click', 'switch', async () => { await refresh(); await back(); await setSearch('fast-assert-minimal-20261006-oc1'); const sw = f.locator('[data-slot="card"]').first().locator('[role="switch"]').first(); if ((await sw.getAttribute('aria-checked')) === 'true') await sw.click({ timeout: 5000 }); await sleep(1000); await setSearch(''); });

  // G9-11 declared-market
  await A('导入declared-market', 'setInputFiles+click', 'declared-market', () => importFile(VAR('declared-market')));
  const r11 = await R('本地声明market样本来源', 'market.source', scope + '/详情', 'detail', async () => { const r = await variantRead('fast-assert-declared-market-20261006-oc1'); const src = /来源\s*用户创建/.test(r.desc) ? '用户创建' : null; return { value: src, raw: { cardText: r.desc.slice(0, 200), title: r.title } }; });
  const r11b = await R('本地样本市场关联', 'market.link', scope + '/详情', 'detail', async () => { await back(); await setSearch('fast-assert-declared-market-20261006-oc1'); await f.locator('[data-slot="card"]').first().locator('[data-slot="card-content"]').click({ timeout: 6000 }).catch(() => {}); await sleep(1100); const raw = await f.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); if (!p) return { text: '', hasMarketLink: false }; const t = p.innerText; const anchors = [...p.querySelectorAll('a')].map(a => a.getAttribute('href') || '').filter(h => /market|supcon|http/i.test(h)); const hasMarketLink = /来自市场|市场来源|市场版本|已安装市场/.test(t) || anchors.length > 0; return { text: t.slice(0, 400), anchors, hasMarketLink }; }); await back(); await setSearch(''); return { value: raw.hasMarketLink, raw, derivation: 'detail shows a trusted market association/link' }; });

  // G9-12..15 zips
  const imp12 = { dlg: '', open: false }; await A('导入rich.zip', 'setInputFiles+click', 'rich.zip', async () => { const r = await importFile(ZIP('rich.zip')); imp12.dlg = r.dlg; imp12.open = r.open; });
  const richName = 'fast-assert-rich-20261006-oc1';
  await back(); await setSearch(richName);
  const r12a = await R('rich包图标加载', 'rich.icon.load', scope + '/卡片图标', 'img', async () => { const raw = await f.evaluate(() => { const c = document.querySelector('[data-slot="card"]'); const i = c && c.querySelector('img'); return i ? { complete: i.complete, nw: i.naturalWidth, src: i.getAttribute('src') } : null; }); return { value: !!(raw && raw.complete && raw.nw > 0), raw, derivation: 'img.complete && naturalWidth>0' }; });
  const r12b = await R('rich图标资源来自该安装包', 'rich.icon.source', '安装目录', 'install assets', async () => { const p = path.join(SKILLS_DIR, richName, 'assets', 'icon.png'); return { value: fs.existsSync(p), raw: { path: p, exists: fs.existsSync(p) }, derivation: 'install dir contains assets/icon.png' }; });
  await setSearch('');

  const imp13 = { dlg: '', open: false }; await A('导入missing-icon.zip', 'setInputFiles+click', 'missing-icon.zip', async () => { const r = await importFile(ZIP('missing-icon.zip')); imp13.dlg = r.dlg; imp13.open = r.open; });
  const miName = 'fast-assert-missing-icon-20261006-oc1';
  await back(); await setSearch(miName);
  const r13a = await R('缺图标包存在', 'missingicon.exists', scope + '/搜索结果', 'card', async () => ({ value: (await f.locator('[data-slot="card"]').count()) > 0, raw: { count: await f.locator('[data-slot="card"]').count() }, derivation: 'card present' }));
  const r13b = await R('缺图标包降级图标', 'missingicon.fallback', scope + '/卡片图标', 'icon', async () => { const raw = await f.evaluate(() => { const c = document.querySelector('[data-slot="card"]'); if (!c) return null; const img = c.querySelector('img'); const svg = c.querySelector('svg'); return { hasImg: !!img, brokenImg: img ? (!img.complete || img.naturalWidth === 0) : false, hasSvg: !!svg }; }); return { value: !!(raw && (raw.hasSvg || !raw.hasImg) && !raw.brokenImg), raw, derivation: 'default icon shown and no broken image' }; });
  await setSearch('');

  const imp14 = { dlg: '', open: false }; await A('导入bad-png.zip', 'setInputFiles+click', 'bad-png.zip', async () => { const r = await importFile(ZIP('bad-png.zip')); imp14.dlg = r.dlg; imp14.open = r.open; });
  const bpName = 'fast-assert-bad-png-20261006-oc1';
  await back(); await setSearch(bpName);
  const r14a = await R('伪PNG被作为有效图像', 'badpng.valid', scope + '/卡片图标', 'img', async () => { const raw = await f.evaluate(() => { const c = document.querySelector('[data-slot="card"]'); const i = c && c.querySelector('img'); return i ? { complete: i.complete, nw: i.naturalWidth, src: i.getAttribute('src') } : null; }); return { value: !!(raw && raw.complete && raw.nw > 0), raw, derivation: 'img.complete && naturalWidth>0' }; });
  const r14b = await R('伪PNG默认图标降级', 'badpng.fallback', scope + '/卡片图标', 'icon', async () => { const raw = await f.evaluate(() => { const c = document.querySelector('[data-slot="card"]'); if (!c) return null; return { hasSvg: !!c.querySelector('svg') }; }); return { value: !!(raw && raw.hasSvg), raw, derivation: 'default svg icon present' }; });
  await setSearch('');

  // G9-15 network icon no request
  const reqs = [];
  const onReq = r => { try { reqs.push(r.url()); } catch { } };
  page.on('request', onReq);
  const imp15 = { dlg: '', open: false }; await A('导入network-icon.zip', 'setInputFiles+click', 'network-icon.zip', async () => { const r = await importFile(ZIP('network-icon.zip')); imp15.dlg = r.dlg; imp15.open = r.open; });
  await back(); await setSearch('fast-assert-network-icon-20261006-oc1');
  await sleep(1500);
  page.off('request', onReq);
  const r15 = await R('网络icon实际请求数', 'network.icon.requests', '本轮HTTP监听', 'requests matching icon url', async () => { const n = reqs.filter(u => /127\.0\.0\.1:9\/fast-assert-icon/.test(u)).length; return { value: n, raw: { matched: reqs.filter(u => /127\.0\.0\.1:9/.test(u)), total: reqs.length } }; });
  await setSearch('');

  const ended = new Date().toISOString();
  fs.writeFileSync(path.join(root, 'tools', 'run', 'scratch', 'g9-run.json'), JSON.stringify({ reads, imp7: imp7.dlg, imp8: imp8.dlg, imp12: imp12.dlg, imp13: imp13.dlg, imp14: imp14.dlg, imp15: imp15.dlg, reqs: reqs.length }, null, 2), 'utf8');
  const ev = evidenceFor(g, ['tools/run/scratch/g9-run.json']);
  const mk = (id, object_identity, inputs, steps, assertions, cleanup) => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, attempt_id: 'G9-A01', environment_id: environmentId, evidence: ev, started_at: t0, ended_at: ended, action_refs: actionRefs, cleanup: cleanup || { status: 'retained', description: '本轮技能保留并最终停用/保留待审', read_refs: [] }, notes: 'G9批量导入技能变体与图标包。' });
  mk('G9-01', 'cn-all技能', ['cn-all'], ['导入并读标题'], [{ id: 'G9-01-A1', actual: reads['G9-01'].value, read_refs: [reads['G9-01'].event_id] }]);
  mk('G9-02', 'cn-en技能', ['cn-en'], ['导入并读标题'], [{ id: 'G9-02-A1', actual: reads['G9-02'].value, read_refs: [reads['G9-02'].event_id] }]);
  mk('G9-03', 'cn-tech技能', ['cn-tech'], ['导入并读标题'], [{ id: 'G9-03-A1', actual: reads['G9-03'].value, read_refs: [reads['G9-03'].event_id] }]);
  mk('G9-04', 'en-cn技能', ['en-cn', 'English'], ['导入并切英文读标题'], [{ id: 'G9-04-A1', actual: reads['G9-04'].value, read_refs: [reads['G9-04'].event_id] }]);
  mk('G9-05', 'desc-en技能', ['desc-en'], ['导入并读描述'], [{ id: 'G9-05-A1', actual: reads['G9-05'].value, read_refs: [reads['G9-05'].event_id] }]);
  mk('G9-06', 'desc-tech技能', ['desc-tech'], ['导入并读描述'], [{ id: 'G9-06-A1', actual: reads['G9-06'].value, read_refs: [reads['G9-06'].event_id] }]);
  mk('G9-07', 'missing-name包', ['missing-name'], ['导入并读反馈与注册表'], [{ id: 'G9-07-A1', actual: r7a.value, read_refs: [r7a.event_id] }, { id: 'G9-07-A2', actual: { before: rKeys7Before.value, after: rKeys7After.value }, read_refs: [rKeys7Before.event_id, rKeys7After.event_id] }]);
  mk('G9-08', 'missing-description包', ['missing-description'], ['导入并读反馈与注册表'], [{ id: 'G9-08-A1', actual: r8a.value, read_refs: [r8a.event_id] }, { id: 'G9-08-A2', actual: { before: rKeys8Before.value, after: rKeys8After.value }, read_refs: [rKeys8Before.event_id, rKeys8After.event_id] }]);
  mk('G9-09', 'minimal技能', ['minimal'], ['导入并打开详情'], [{ id: 'G9-09-A1', actual: r9.value, read_refs: [r9.event_id] }]);
  mk('G9-10', 'minimal技能调用', ['minimal'], ['启用并调用'], [{ id: 'G9-10-A1', actual: r10a.value, read_refs: [r10a.event_id] }, { id: 'G9-10-A2', actual: r10b.value, read_refs: [r10b.event_id] }]);
  mk('G9-11', 'declared-market技能', ['declared-market'], ['导入读来源与市场关联'], [{ id: 'G9-11-A1', actual: r11.value, read_refs: [r11.event_id] }, { id: 'G9-11-A2', actual: r11b.value, read_refs: [r11b.event_id] }]);
  mk('G9-12', 'rich包', ['rich.zip'], ['导入读图标'], [{ id: 'G9-12-A1', actual: r12a.value, read_refs: [r12a.event_id] }, { id: 'G9-12-A2', actual: r12b.value, read_refs: [r12b.event_id] }]);
  mk('G9-13', 'missing-icon包', ['missing-icon.zip'], ['导入读图标'], [{ id: 'G9-13-A1', actual: r13a.value, read_refs: [r13a.event_id] }, { id: 'G9-13-A2', actual: r13b.value, read_refs: [r13b.event_id] }]);
  mk('G9-14', 'bad-png包', ['bad-png.zip'], ['导入读图标'], [{ id: 'G9-14-A1', actual: r14a.value, read_refs: [r14a.event_id] }, { id: 'G9-14-A2', actual: r14b.value, read_refs: [r14b.event_id] }]);
  mk('G9-15', 'network-icon包', ['network-icon.zip'], ['监听请求并导入'], [{ id: 'G9-15-A1', actual: r15.value, read_refs: [r15.event_id] }]);
  console.log(JSON.stringify({ titles: Object.fromEntries(Object.entries(reads).map(([k, v]) => [k, v.value])), imp7: imp7.dlg.slice(0, 120), imp8: imp8.dlg.slice(0, 120), r9: r9.value, r10: [r10a.value, r10b.value], r11: [r11.value, r11b.value], r12: [r12a.value, r12b.value], r13: [r13a.value, r13b.value], r14: [r14a.value, r14b.value], r15: r15.value, keys7Same: JSON.stringify(rKeys7Before.value) === JSON.stringify(rKeys7After.value), keys8Same: JSON.stringify(rKeys8Before.value) === JSON.stringify(rKeys8After.value) }, null, 2));
});
