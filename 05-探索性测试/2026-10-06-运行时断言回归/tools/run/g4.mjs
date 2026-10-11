import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { withApp, sleep, root, environmentId, evidenceFor, finalizeCase, fixtureRoot, expertsFrame } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G4';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, locatorOrFn, fnOr) => { const locator = typeof locatorOrFn === 'function' ? scope : locatorOrFn; const fn = typeof locatorOrFn === 'function' ? locatorOrFn : fnOr; return log.read(target, object_id, { channel: 'dom', scope, locator }, fn); };
const MY_NAME = 'fast-assert-expert-20261006-oc1';
const MY_TITLE = '本轮快速回归专家';
const out = {};

await withApp(async (page) => {
  const scope = '专家iframe/supcon-agents';
  const frame = await expertsFrame(page);

  const isDetail = () => frame.evaluate(() => /专家详情/.test(document.body.innerText));
  const backToList = async () => {
    for (let i = 0; i < 3; i++) {
      if (!(await isDetail())) return;
      await frame.getByRole('button', { name: '专家', exact: true }).first().click({ timeout: 5000 }).catch(() => {});
      await sleep(900);
    }
  };
  const closeDialogs = async () => {
    for (let i = 0; i < 4; i++) {
      const has = await frame.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some(e => e.offsetWidth));
      if (!has) break;
      const x = frame.locator('[role="dialog"] button[aria-label="关闭"], [role="dialog"] button').filter({ hasText: /^×$/ }).first();
      if (await x.count()) await x.click({ timeout: 3000 }).catch(() => {});
      else await frame.getByRole('button', { name: '取消', exact: true }).first().click({ timeout: 3000 }).catch(() => {});
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(500);
    }
  };
  const detailRead = async () => frame.evaluate(() => {
    const t = document.body.innerText;
    if (!/专家详情/.test(t)) return null;
    const name = (t.match(/name:\s*(fast-assert-[^\s]+)/) || [])[1] || null;
    return { name, text: t.slice(0, 5000) };
  });
  const openMine = async () => {
    await backToList();
    const cards = frame.locator('._card_c5z1c_2').filter({ hasText: MY_TITLE });
    const n = await cards.count();
    for (let i = 0; i < n; i++) {
      await cards.nth(i).locator('div.cursor-pointer').first().click({ timeout: 6000 }).catch(async () => { await cards.nth(i).click({ timeout: 6000 }); });
      await sleep(1200);
      const d = await detailRead();
      if (d && d.name === MY_NAME) return d;
      await backToList();
    }
    return null;
  };

  await closeDialogs(); await backToList();

  // G4-01
  await A('打开专家导入弹窗', 'click', '导入专家', async () => { await frame.getByRole('button', { name: '导入专家', exact: true }).click({ timeout: 8000 }); await sleep(1200); });
  const r1 = await R('专家导入弹窗', scope + '/导入弹窗', '导入弹窗', async () => {
    const raw = await frame.evaluate(() => { const dlg = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); return { dirInputs: [...document.querySelectorAll('input[type="file"][webkitdirectory]')].length, fileInputs: document.querySelectorAll('input[type="file"]').length, dialog: dlg ? dlg.innerText.replace(/\s+/g, ' ').slice(0, 160) : null }; });
    return { value: raw.dirInputs, raw, derivation: 'count webkitdirectory file inputs' };
  });

  // G4-02 import (same-name object from this round already present -> resolve conflict by overwrite)
  await A('提交专家目录导入', 'setInputFiles+click', '夹具/本轮/20261006-oc1/expert-import', async () => {
    const dir = frame.locator('input[type="file"][webkitdirectory]').first();
    await dir.setInputFiles(path.join(fixtureRoot, 'expert-import'));
    await sleep(800);
    await frame.getByRole('button', { name: '提交', exact: true }).click({ timeout: 8000 });
    await sleep(2500);
    const conflict = frame.getByRole('button', { name: '覆盖现有', exact: true });
    if (await conflict.count()) { await conflict.click({ timeout: 5000 }); await sleep(2500); }
  });
  const importResult = await frame.evaluate(() => { const dlg = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); return dlg ? dlg.innerText.replace(/\s+/g, ' ') : '(dialog closed)'; });
  await closeDialogs();
  const d = await openMine();
  out.detail = d && { name: d.name };
  const r2 = await R('本轮专家卡', scope + '/我的专家列表', 'expert card', async () => ({ value: d && d.name === MY_NAME, raw: { importResult: importResult.slice(0, 300), detailName: d && d.name }, derivation: 'detail internal name equals ' + MY_NAME }));

  const d2 = await openMine();
  out.detail2 = d2 && { name: d2.name };
  const r3 = await R('本轮专家来源与运行类型', scope + '/本轮详情', 'detail fields', async () => {
    const t = d2 ? d2.text : '';
    return { value: [/来源\s*我创建的/.test(t) ? '我创建的' : null, /运行类型\s*本地运行/.test(t) ? '本地运行' : null], raw: { hasSrc: /我创建的/.test(t), hasRun: /本地运行/.test(t) } };
  });
  const r4 = await R('本轮专家名称与版本', scope + '/本轮详情', 'detail fields', async () => {
    const t = d2 ? d2.text : '';
    const title = t.includes(MY_TITLE) ? MY_TITLE : null;
    const m = t.match(/版本\s*v?([0-9]+\.[0-9]+\.[0-9]+)/);
    return { value: [title, m ? m[1] : null], raw: { title, version: m && m[1] } };
  });
  const r5 = await R('本轮专家提示词正文', scope + '/本轮详情/专家提示词', 'detail prompt', async () => ({ value: d2 ? d2.text : '', raw: { hasOk: /return exactly FAST_EXPERT_EXEC_OK/.test(d2 ? d2.text : '') } }));
  const r6 = await R('专家提示词面板', scope + '/本轮详情', 'editable elements', async () => { const n = await frame.evaluate(() => document.querySelectorAll('textarea, [contenteditable="true"]').length); return { value: n, raw: { editableCount: n } }; });
  const r7 = await R('专家推荐问题', scope + '/本轮详情/推荐问题', 'quick prompts', async () => {
    const qs = await frame.evaluate(() => [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent || '').trim() === '请执行你的本轮回归固定回复规则。').map(e => e.textContent.trim()));
    return { value: [...new Set(qs)], raw: { questions: qs } };
  });
  const r8 = await R('本轮详情目录入口', scope + '/本轮详情', 'folder button', async () => {
    const n = await frame.evaluate(() => [...document.querySelectorAll('button')].filter(b => /打开文件夹|打开目录|本地打开/.test(b.innerText || '')).length);
    return { value: n, raw: { count: n } };
  });
  await backToList();

  const ended = new Date().toISOString();
  fs.writeFileSync(path.join(root, 'tools', 'run', 'scratch', 'g4-run.json'), JSON.stringify(out, null, 2), 'utf8');
  const ev = evidenceFor(g, ['tools/run/scratch/g4-run.json']);
  const mk = (id, object_identity, inputs, steps, assertions) => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, attempt_id: 'G4-A01', environment_id: environmentId, evidence: ev, started_at: t0, ended_at: ended, action_refs: actionRefs, cleanup: { status: 'retained', description: '本轮专家保留待审；导入源目录只读', read_refs: [] }, notes: 'G4共享一次专家目录导入与详情快照。' });
  mk('G4-01', '专家导入弹窗', [], ['点击导入专家', '读取目录input'], [{ id: 'G4-01-A1', actual: r1.value, read_refs: [r1.event_id] }]);
  mk('G4-02', '本轮专家卡', ['expert-import目录'], ['setInputFiles', '点击提交', '同名冲突选择覆盖'], [{ id: 'G4-02-A1', actual: r2.value, read_refs: [r2.event_id] }]);
  mk('G4-03', '本轮专家来源与运行类型', [], ['读取详情来源与运行类型'], [{ id: 'G4-03-A1', actual: r3.value, read_refs: [r3.event_id] }]);
  mk('G4-04', '本轮专家名称与版本', [], ['读取详情名称和版本'], [{ id: 'G4-04-A1', actual: r4.value, read_refs: [r4.event_id] }]);
  mk('G4-05', '本轮专家提示词正文', [], ['读取详情正文'], [{ id: 'G4-05-A1', actual: r5.value, read_refs: [r5.event_id] }]);
  mk('G4-06', '专家提示词面板', [], ['统计可编辑元素'], [{ id: 'G4-06-A1', actual: r6.value, read_refs: [r6.event_id] }]);
  mk('G4-07', '专家推荐问题', [], ['读取推荐问题'], [{ id: 'G4-07-A1', actual: r7.value, read_refs: [r7.event_id] }]);
  mk('G4-08', '本轮详情目录入口', [], ['统计打开文件夹按钮'], [{ id: 'G4-08-A1', actual: r8.value, read_refs: [r8.event_id] }]);
  console.log(JSON.stringify({ importResult: importResult.slice(0, 160), detailName: d && d.name, r3: r3.value, r4: r4.value, r6: r6.value, r7: r7.value, r8: r8.value }, null, 2));
});
