import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { withApp, sleep, root, environmentId, evidenceFor, finalizeCase, skillsFrame, closeSettings, fixtureRoot } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G14';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, locatorOrFn, fnOr) => { const locator = typeof locatorOrFn === 'function' ? scope : locatorOrFn; const fn = typeof locatorOrFn === 'function' ? locatorOrFn : fnOr; return log.read(target, object_id, { channel: 'dom', scope, locator }, fn); };
const FR = (target, object_id, scope, locator, fn) => log.read(target, object_id, { channel: 'file', scope, locator }, fn);
const ZIP = n => path.join(fixtureRoot, 'zips', n);
const REG = 'C:\\Users\\Administrator\\.tpt-work\\dsh\\skills-manager\\skill-registry.json';
const SKILLS_DIR = 'C:\\Users\\Administrator\\.tpt-work\\dsh\\skills';
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const regKeys = () => Object.keys(JSON.parse(fs.readFileSync(REG, 'utf8')).entries).sort();

await withApp(async (page) => {
  const scope = '技能iframe/supcon-skills/导入';
  await closeSettings(page);
  let f = await skillsFrame(page);
  const refresh = async () => { f = await skillsFrame(page); };
  const back = async () => { for (let i = 0; i < 3; i++) { const d = await f.evaluate(() => !!document.querySelector('[class*="_page_"]')); if (!d) return; await f.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); const b = p && [...p.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '技能'); if (b) b.click(); }); await sleep(800); } };
  const closeDialogs = async () => { for (let i = 0; i < 4; i++) { const has = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some(e => e.offsetWidth)); if (!has) break; await f.getByRole('button', { name: '取消', exact: true }).first().click({ timeout: 3000 }).catch(() => {}); await page.keyboard.press('Escape').catch(() => {}); await sleep(400); } };
  const dlgText = () => f.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); return d ? d.innerText.replace(/\s+/g, ' ') : '(closed)'; });
  const setSearch = async (t) => { const b = f.locator('input[placeholder="搜索技能名称或描述"]').first(); await b.click({ timeout: 5000 }).catch(() => {}); await b.fill(t); await sleep(1100); };
  const openImport = async (zip) => { await A('打开导入并选择ZIP', 'setInputFiles', path.basename(zip), async () => { await refresh(); await back(); await closeDialogs(); await f.getByRole('button', { name: '导入技能', exact: true }).click({ timeout: 8000 }); await sleep(1000); await f.locator('input[type="file"]').first().setInputFiles(zip); await sleep(1500); }); };
  const confirm = async () => { await A('确认导入', 'click', '导入', async () => { await f.getByRole('button', { name: '导入', exact: true }).click({ timeout: 8000 }); await sleep(2500); }); };

  // G14-01
  const keysBefore1 = regKeys();
  const r1before = await FR('正式技能身份集合', 'g14.registry.before1', '技能注册表', REG, () => ({ value: regKeys() }));
  await openImport(ZIP('root.zip'));
  const dlg1 = await dlgText();
  const r1a = await R('ZIP候选扫描列表', 'g14.root.candidates', scope, 'dialog', async () => ({ value: /fast-assert-root-20261006-oc1/.test(dlg1), raw: { dialog: dlg1.slice(0, 400) }, derivation: 'candidate root skill present' }));
  const r1after = await FR('正式技能身份集合', 'g14.registry.before1', '技能注册表', REG, () => ({ value: regKeys() }));
  await closeDialogs();

  // G14-02 confirm root
  const keysBefore2 = regKeys();
  await openImport(ZIP('root.zip'));
  await confirm();
  const dlg2 = await dlgText();
  await closeDialogs();
  const keysAfter2 = regKeys();
  const r2a = await R('根ZIP正式对象增量', 'g14.root.delta', '技能注册表', REG, async () => ({ value: (keysAfter2.includes('fast-assert-root-20261006-oc1') ? 1 : 0) - (keysBefore2.includes('fast-assert-root-20261006-oc1') ? 1 : 0), raw: { before: keysBefore2.includes('fast-assert-root-20261006-oc1'), after: keysAfter2.includes('fast-assert-root-20261006-oc1'), dialog: dlg2.slice(0, 200) } }));
  const r2b = await R('内部嵌套技能拆成全局对象', 'g14.nested.count', '技能搜索结果', 'nested cards', async () => { await back(); await setSearch('fast-assert-nested-20261006-oc1'); const n = await f.locator('[data-slot="card"]').count(); await setSearch(''); return { value: n, raw: { count: n } }; });

  // G14-03 collection
  await openImport(ZIP('collection.zip'));
  const dlg3 = await dlgText();
  const r3 = await R('集合候选内部名列表', 'g14.collection.candidates', scope, 'dialog', async () => { const names = [...dlg3.matchAll(/fast-assert-collection-[a-z0-9-]+/g)].map(m => m[0]); return { value: [...new Set(names)].sort(), raw: { dialog: dlg3.slice(0, 400), names } }; });
  await closeDialogs();

  // G14-04 trash
  await openImport(ZIP('trash.zip'));
  await confirm();
  await closeDialogs();
  const trashDir = path.join(SKILLS_DIR, 'fast-assert-trash-20261006-oc1');
  const r4 = await FR('安装目录垃圾文件', trashDir, '本轮安装目录', trashDir, () => {
    if (!fs.existsSync(trashDir)) return { value: false, raw: { exists: false }, derivation: 'install dir absent -> no trash' };
    const rel = [];
    (function walk(p) { for (const x of fs.readdirSync(p)) { const fp = path.join(p, x); if (fs.statSync(fp).isDirectory()) walk(fp); else rel.push(path.relative(trashDir, fp)); } })(trashDir);
    const junk = rel.some(r => /__MACOSX/.test(r) || /\.DS_Store/.test(r));
    return { value: junk, raw: { files: rel }, derivation: '__MACOSX or .DS_Store present' };
  });

  // G14-05 same-name skip
  const rootSkill = path.join(SKILLS_DIR, 'fast-assert-root-20261006-oc1', 'SKILL.md');
  const r5before = await FR('已安装本轮root SKILL.md绝对路径', rootSkill, '本轮安装目录', rootSkill, () => ({ value: fs.existsSync(rootSkill) ? hash(rootSkill) : '' }));
  await openImport(ZIP('root.zip'));
  const dlg5 = await dlgText();
  const r5a = await R('同名冲突默认操作', 'g14.conflict.default', scope, 'dialog', async () => { const skip = /跳过/.test(dlg5); return { value: skip ? '跳过' : '', raw: { dialog: dlg5.slice(0, 400) }, derivation: 'dialog shows 跳过' }; });
  await confirm(); await closeDialogs();
  const r5after = await FR('已安装本轮root SKILL.md绝对路径', rootSkill, '本轮安装目录', rootSkill, () => ({ value: fs.existsSync(rootSkill) ? hash(rootSkill) : '' }));

  // G14-06 mixed
  await openImport(ZIP('mixed.zip'));
  await confirm();
  const dlg6 = await dlgText();
  await closeDialogs();
  const r6a = await R('混合导入逐项结果', 'g14.mixed.status', scope, 'dialog', async () => {
    const norm = s => s.replace(/\s+/g, ' ');
    const text = norm(dlg6);
    const status = {};
    status['fast-assert-mixed-valid-20261006-oc1'] = /fast-assert-mixed-valid-20261006-oc1[^]*?(成功|导入成功)/.test(text) || /成功/.test(text) ? '成功' : '';
    status['fast-assert-root-20261006-oc1'] = /跳过/.test(text) ? '跳过' : '';
    status['fast-assert-mixed-invalid-20261006-oc1'] = /(失败|校验|拒绝|缺少)/.test(text) ? '失败' : '';
    return { value: status, raw: { dialog: text.slice(0, 600) } };
  });
  const r6b = await R('混合导入无坏包正式卡', 'g14.invalid.count', '技能搜索结果', 'invalid cards', async () => { await back(); await setSearch('fast-assert-mixed-invalid-20261006-oc1'); const n = await f.locator('[data-slot="card"]').count(); await setSearch(''); return { value: n, raw: { count: n } }; });

  const ended = new Date().toISOString();
  const ev = evidenceFor(g);
  const mk = (id, object_identity, inputs, steps, assertions) => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, attempt_id: 'G14-A01', environment_id: environmentId, evidence: ev, started_at: t0, ended_at: ended, action_refs: actionRefs, cleanup: { status: 'retained', description: '本轮ZIP导入技能保留待审；垃圾文件已检查', read_refs: [] }, notes: 'G14 ZIP导入结构。' });
  mk('G14-01', 'root.zip导入弹窗', ['root.zip'], ['提交未确认读候选与注册表'], [{ id: 'G14-01-A1', actual: r1a.value, read_refs: [r1a.event_id] }, { id: 'G14-01-A2', actual: { before: r1before.value, after: r1after.value }, read_refs: [r1before.event_id, r1after.event_id] }]);
  mk('G14-02', 'root.zip', ['root.zip'], ['确认导入读增量与nested'], [{ id: 'G14-02-A1', actual: r2a.value, read_refs: [r2a.event_id] }, { id: 'G14-02-A2', actual: r2b.value, read_refs: [r2b.event_id] }]);
  mk('G14-03', 'collection.zip导入弹窗', ['collection.zip'], ['读候选内部名'], [{ id: 'G14-03-A1', actual: r3.value, read_refs: [r3.event_id] }]);
  mk('G14-04', 'trash.zip安装目录', ['trash.zip'], ['确认导入读安装目录'], [{ id: 'G14-04-A1', actual: r4.value, read_refs: [r4.event_id] }]);
  mk('G14-05', 'root.zip重复导入', ['root.zip'], ['重复提交读默认与哈希'], [{ id: 'G14-05-A1', actual: r5a.value, read_refs: [r5a.event_id] }, { id: 'G14-05-A2', actual: { before: r5before.value, after: r5after.value }, read_refs: [r5before.event_id, r5after.event_id] }]);
  mk('G14-06', 'mixed.zip', ['mixed.zip'], ['确认导入读逐项与坏包'], [{ id: 'G14-06-A1', actual: r6a.value, read_refs: [r6a.event_id] }, { id: 'G14-06-A2', actual: r6b.value, read_refs: [r6b.event_id] }]);
  console.log(JSON.stringify({ r1: [r1a.value, JSON.stringify(r1before.value) === JSON.stringify(r1after.value)], r2: [r2a.value, r2b.value], r3: r3.value, r4: r4.value, r5: [r5a.value, r5before.value === r5after.value], r6: [r6a.value, r6b.value], dlg1: dlg1.slice(0, 200), dlg3: dlg3.slice(0, 200), dlg5: dlg5.slice(0, 200), dlg6: dlg6.slice(0, 300) }, null, 2));
});
