import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { withApp, sleep, root, environmentId, evidenceFor, finalizeCase, fixtureRoot } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G2';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, fn) => log.read(target, object_id, { channel: 'dom', scope, locator: scope }, fn);
const MY_NAME = 'fast-assert-skill-20261006-oc1';
const MY_TITLE = '本轮快速回归技能';
const out = {};

await withApp(async (page) => {
  const frame = page.frame({ url: /supcon-skills/ });
  const scope = '技能iframe/supcon-skills';

  const backToList = async () => {
    for (let i = 0; i < 3; i++) {
      const isDetail = await frame.evaluate(() => !!document.querySelector('[class*="_page_"]'));
      if (!isDetail) return;
      await frame.evaluate(() => {
        const p = document.querySelector('[class*="_page_"]');
        const b = p && [...p.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '技能');
        if (b) b.click();
      });
      await sleep(900);
    }
  };
  const setSearch = async (text) => {
    const box = frame.locator('input[placeholder="搜索技能名称或描述"]').first();
    await box.click({ timeout: 5000 });
    await box.fill(text);
    await sleep(1200);
  };
  const detailRead = async () => frame.evaluate(() => {
    const p = document.querySelector('[class*="_page_"]');
    if (!p) return null;
    const t = p.innerText;
    const name = (t.match(/name:\s*([^\s]+)/) || [])[1] || null;
    const lines = t.split('\n').map(s => s.trim()).filter(Boolean);
    const di = lines.indexOf('详情');
    const title = di >= 0 ? lines[di + 1] : null;
    const ver = (t.match(/版本\n([0-9][^\n]*)/) || [])[1] || null;
    const src = (t.match(/来源\n([^\n]+)/) || [])[1] || null;
    return { name, title, version: ver, source: src, text: t.slice(0, 3000) };
  });
  const openMyDetail = async () => {
    // open the card whose detail internal name matches MY_NAME
    await backToList();
    const cards = frame.locator('[data-slot="card"]').filter({ hasText: MY_TITLE });
    const n = await cards.count();
    for (let i = 0; i < n; i++) {
      await cards.nth(i).locator('[data-slot="card-content"]').click({ timeout: 8000 }).catch(() => {});
      await sleep(1300);
      const d = await detailRead();
      if (d && d.name === MY_NAME) return d;
      await backToList();
    }
    return null;
  };
  const countCardsMatchingName = async () => {
    await backToList();
    const cards = frame.locator('[data-slot="card"]').filter({ hasText: MY_TITLE });
    const n = await cards.count();
    let mine = 0; const names = [];
    for (let i = 0; i < n; i++) {
      await cards.nth(i).locator('[data-slot="card-content"]').click({ timeout: 8000 }).catch(() => {});
      await sleep(1100);
      const d = await detailRead();
      names.push(d ? d.name : null);
      if (d && d.name === MY_NAME) mine++;
      await backToList();
    }
    return { total: n, mine, names };
  };

  await backToList();
  // close any stray dialog left from earlier probes
  for (let i = 0; i < 4; i++) {
    const has = await frame.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some(e => e.offsetWidth));
    if (!has) break;
    const cancel = frame.getByRole('button', { name: '取消', exact: true });
    if (await cancel.count()) await cancel.first().click({ timeout: 3000 }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(500);
  }
  await A('打开技能导入弹窗', 'click', '导入技能', async () => {
    await frame.getByRole('button', { name: '导入技能', exact: true }).click({ timeout: 8000 });
    await sleep(1200);
  });
  const r1 = await R('技能导入弹窗', scope + '/导入弹窗', scope + '/导入弹窗', async () => {
    const raw = await frame.evaluate(() => {
      const dlg = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth);
      return { fileInputs: document.querySelectorAll('input[type="file"]').length, dialog: dlg ? dlg.innerText.replace(/\s+/g, ' ').slice(0, 200) : null };
    });
    return { value: raw.fileInputs, raw, derivation: 'count file inputs in import dialog' };
  });

  // G2-02: single-file import (product skips same internal name; object from this run's import)
  const countBefore = await frame.evaluate(() => document.querySelectorAll('[data-slot="card"]').length);
  await A('提交SKILL.md导入', 'setInputFiles+click', '夹具/本轮/20261006-oc1/skill-import/SKILL.md', async () => {
    const single = frame.locator('input[type="file"]').first();
    await single.setInputFiles(path.join(fixtureRoot, 'skill-import', 'SKILL.md'));
    await sleep(800);
    await frame.getByRole('button', { name: '导入', exact: true }).click({ timeout: 8000 });
    await sleep(2500);
  });
  const importDialogText = await frame.evaluate(() => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth);
    return dlg ? dlg.innerText.replace(/\s+/g, ' ') : '';
  });
  const rImport = await R('导入提交结果', scope + '/导入弹窗', '导入弹窗', async () => ({ value: importDialogText, raw: { dialog: importDialogText } }));
  // close dialog
  for (let i = 0; i < 3; i++) {
    const has = await frame.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some(e => e.offsetWidth));
    if (!has) break;
    const cancel = frame.getByRole('button', { name: '取消', exact: true });
    if (await cancel.count()) await cancel.first().click({ timeout: 3000 }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(600);
  }
  const countAfter = await frame.evaluate(() => document.querySelectorAll('[data-slot="card"]').length);
  const cnt = await countCardsMatchingName();
  out.import = { countBefore, countAfter, importDialogText, ...cnt };
  const r2 = await R('本轮技能卡', scope + '/我的技能列表', '[data-slot="card"]', async () => ({ value: cnt.mine > 0, raw: cnt, derivation: 'cards whose detail internal name equals ' + MY_NAME }));

  // G2-03 title (from matching card H3)
  const r3 = await R('本轮技能标题', scope + '/本轮卡片标题', 'h3[class=card-title]', async () => {
    await backToList();
    const card = frame.locator('[data-slot="card"]').filter({ hasText: MY_TITLE }).first();
    const title = await card.locator('h3').first().innerText().catch(() => null);
    return { value: title ? title.trim() : null, raw: { title } };
  });

  // G2-04 english unique token search -> count cards whose internal name is mine
  await A('搜索英文唯一词', 'fill', 'FastRegressionSkillUnique', () => setSearch('FastRegressionSkillUnique'));
  const r4 = await R('英文唯一词搜索结果', scope + '/搜索结果列表', 'input[placeholder=搜索技能名称或描述]', async () => {
    const res = await countCardsMatchingName();
    return { value: res.mine, raw: res, derivation: 'count search-result cards whose detail internal name equals ' + MY_NAME };
  });
  out.search_en = r4.raw;

  // G2-05 description search
  await A('搜索描述唯一词', 'fill', 'regression-description-unique-token', () => setSearch('regression-description-unique-token'));
  const r5a = await R('描述唯一词搜索结果', scope + '/搜索结果列表', 'input', async () => {
    const res = await countCardsMatchingName();
    return { value: res.mine, raw: res, derivation: 'count cards whose internal name is mine' };
  });
  const r5b = await R('本轮技能标题是否含描述搜索词', scope + '/本轮卡片标题', 'h3', async () => {
    const card = frame.locator('[data-slot="card"]').filter({ hasText: MY_TITLE }).first();
    const title = (await card.locator('h3').first().innerText().catch(() => '')).trim();
    return { value: title.includes('regression-description-unique-token'), raw: { title }, derivation: "title.includes('regression-description-unique-token')" };
  });

  // G2-06 version + G2-07 source + G2-08 body : from my detail
  const d = await openMyDetail();
  out.detail = d && { name: d.name, title: d.title, version: d.version, source: d.source, bodyHasOk: /reply exactly FAST_SKILL_EXEC_OK/.test(d.text) };
  const r6 = await R('本轮技能版本', scope + '/本轮详情', '版本行', async () => ({ value: d ? d.version : null, raw: { version: d && d.version } }));
  const r7 = await R('本轮技能来源', scope + '/本轮详情', '来源行', async () => ({ value: d ? d.source : null, raw: { source: d && d.source } }));
  const r8 = await R('技能详情SKILL.md', scope + '/本轮详情/SKILL.md', 'pre code', async () => ({ value: d ? d.text : '', raw: { hasOk: /reply exactly FAST_SKILL_EXEC_OK/.test(d ? d.text : '') } }));
  await backToList();

  const ended = new Date().toISOString();
  const mk = (id, object_identity, inputs, steps, assertions) => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, attempt_id: 'G2-A01', environment_id: environmentId, evidence: evidenceFor(g, ['tools/run/scratch/g2-run.json']), started_at: t0, ended_at: ended, action_refs: actionRefs, cleanup: { status: 'retained', description: '本轮导入技能保留并最终停用（G3处理）', read_refs: [] }, notes: 'G2共享一次导入、卡片与详情快照。' });
  fs.writeFileSync(path.join(root, 'tools', 'run', 'scratch', 'g2-run.json'), JSON.stringify(out, null, 2), 'utf8');

  mk('G2-01', '技能导入弹窗', [], ['点击导入技能', '读取file input数量'], [{ id: 'G2-01-A1', actual: r1.value, read_refs: [r1.event_id] }]);
  mk('G2-02', '本轮技能卡', ['SKILL.md'], ['setInputFiles', '点击导入'], [{ id: 'G2-02-A1', actual: r2.value, read_refs: [r2.event_id] }]);
  mk('G2-03', '本轮技能标题', [], ['读取卡片标题'], [{ id: 'G2-03-A1', actual: r3.value, read_refs: [r3.event_id] }]);
  mk('G2-04', '英文唯一词搜索结果', ['FastRegressionSkillUnique'], ['搜索英文唯一词', '按内部name计数'], [{ id: 'G2-04-A1', actual: r4.value, read_refs: [r4.event_id] }]);
  mk('G2-05', '描述唯一词搜索结果', ['regression-description-unique-token'], ['搜索描述词'], [{ id: 'G2-05-A1', actual: r5a.value, read_refs: [r5a.event_id] }, { id: 'G2-05-A2', actual: r5b.value, read_refs: [r5b.event_id] }]);
  mk('G2-06', '本轮技能版本', [], ['打开详情读取版本'], [{ id: 'G2-06-A1', actual: r6.value, read_refs: [r6.event_id] }]);
  mk('G2-07', '本轮技能来源', [], ['读取来源'], [{ id: 'G2-07-A1', actual: r7.value, read_refs: [r7.event_id] }]);
  mk('G2-08', '技能详情SKILL.md', [], ['读取详情正文'], [{ id: 'G2-08-A1', actual: r8.value, read_refs: [r8.event_id] }]);
  console.log(JSON.stringify(out, null, 2));
});
