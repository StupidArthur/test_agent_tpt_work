import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { withApp, sleep, root, environmentId, evidenceFor, finalizeCase, skillsFrame, closeSettings, newTask, waitTerminal, lastAssistantText, SEL } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G10';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, locatorOrFn, fnOr) => { const locator = typeof locatorOrFn === 'function' ? scope : locatorOrFn; const fn = typeof locatorOrFn === 'function' ? locatorOrFn : fnOr; return log.read(target, object_id, { channel: 'dom', scope, locator }, fn); };
const FR = (target, object_id, scope, locator, fn) => log.read(target, object_id, { channel: 'file', scope, locator }, fn);
const RICH = 'fast-assert-rich-20261006-oc1';
const SKILL_MD = 'C:\\Users\\Administrator\\.tpt-work\\dsh\\skills\\' + RICH + '\\SKILL.md';
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const out = {};

await withApp(async (page) => {
  const scope = '技能iframe/supcon-skills/详情';
  await closeSettings(page);
  let f = await skillsFrame(page);
  const refresh = async () => { f = await skillsFrame(page); };
  const back = async () => { for (let i = 0; i < 3; i++) { const d = await f.evaluate(() => !!document.querySelector('[class*="_page_"]')); if (!d) return; await f.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); const b = p && [...p.querySelectorAll('button')].find(x => (x.innerText || '').trim() === '技能'); if (b) b.click(); }); await sleep(800); } };
  const setSearch = async (t) => { const b = f.locator('input[placeholder="搜索技能名称或描述"]').first(); await b.click({ timeout: 5000 }).catch(() => {}); await b.fill(t); await sleep(1100); };
  const openRich = async () => { await refresh(); await back(); await setSearch(RICH); await f.locator('[data-slot="card"]').first().locator('[data-slot="card-content"]').click({ timeout: 6000 }).catch(() => {}); await sleep(1500); };
  const clickTree = async (text) => { await f.evaluate((text) => { const p = document.querySelector('[class*="_page_"]'); if (!p) return; const leaf = [...p.querySelectorAll('*')].find(e => e.children.length === 0 && (e.textContent || '').trim() === text); if (leaf) { (leaf.closest('button,[role="treeitem"],[class*="node"],[class*="item"]') || leaf).click(); } }, text); await sleep(1000); };
  const treeNodeVisible = (text) => f.evaluate((text) => { const p = document.querySelector('[class*="_page_"]'); if (!p) return null; const leaf = [...p.querySelectorAll('*')].find(e => e.children.length === 0 && (e.textContent || '').trim() === text); return leaf ? !!(leaf.offsetWidth || leaf.offsetHeight) : false; }, text);
  const ensureFile = async (file, folder) => { if (!(await treeNodeVisible(file))) await clickTree(folder); await clickTree(file); };
  const previewInfo = () => f.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); if (!p) return { selected: null, text: '' }; const t = p.innerText; const lines = t.split('\n').map(s => s.trim()); const i = lines.indexOf('只读查看'); const selected = i > 0 ? lines.slice(0, i).reverse().find(s => s && !/详情|SKILL 目录|个文件|assets|data|references|SKILL.md/.test(s) === false ? s : s) : null; return { selectedLine: i > 0 ? lines[i - 1] : null, text: t, imgs: [...p.querySelectorAll('img')].map(im => ({ complete: im.complete, nw: im.naturalWidth })), editables: p.querySelectorAll('textarea,[contenteditable="true"]').length }; });
  const setSkillEnabled = async (on) => { await refresh(); await back(); await setSearch(RICH); const sw = f.locator('[data-slot="card"]').first().locator('[role="switch"]').first(); try { if ((await sw.getAttribute('aria-checked')) !== String(on)) await sw.click({ timeout: 4000 }); } catch { } await sleep(900); await setSearch(''); };
  const callRich = async (expect) => { await closeSettings(page); await newTask(page); const c = page.locator(SEL.composer).first(); await c.click({ timeout: 8000 }); await page.keyboard.type('/' + RICH + ' '); await sleep(400); await page.keyboard.type('请执行固定回复规则'); await sleep(400); const send = page.locator(SEL.send).first(); for (let i = 0; i < 30; i++) { if (!(await send.isDisabled().catch(() => true))) break; await sleep(300); } await send.click({ timeout: 8000 }); return waitTerminal(page, { expect, timeout: 120000 }); };

  // G10-01
  await openRich();
  const r1a = await R('详情初始选中文件', 'rich.selected', scope, 'selected node', async () => { const p = await previewInfo(); return { value: (p.selectedLine || '').replace(/^\s*/, ''), raw: { selectedLine: p.selectedLine } }; });
  const r1b = await R('默认预览完整正文', 'rich.preview', scope, 'preview text', async () => { const p = await previewInfo(); return { value: p.text, raw: { has: p.text.includes('FAST_RICH_BASE_OK') } }; });

  // G10-02 deep file
  await A('展开references并选择checklist.md', 'click', 'references/handbook/advanced/checklist.md', async () => { await clickTree('references'); await clickTree('handbook'); await clickTree('advanced'); await clickTree('checklist.md'); });
  const r2 = await R('深层文件预览', 'rich.deep', scope, 'preview', async () => { const p = await previewInfo(); return { value: p.text, raw: { has: p.text.includes('FAST_DEEP_CHECKLIST') } }; });

  // G10-03 collapse
  await A('收起references', 'click', 'references', () => clickTree('references'));
  const r3a = await R('收起后的深层节点可见', 'rich.collapsed', scope, 'checklist node', async () => ({ value: await treeNodeVisible('checklist.md'), raw: { visible: await treeNodeVisible('checklist.md') }, derivation: 'checklist.md tree node offsetWidth>0 after collapsing references' }));
  await A('展开references', 'click', 'references', () => clickTree('references'));
  const r3b = await R('恢复展开深层节点可见', 'rich.expanded', scope, 'checklist node', async () => ({ value: await treeNodeVisible('checklist.md'), raw: { visible: await treeNodeVisible('checklist.md') }, derivation: 'checklist.md tree node offsetWidth>0 after expanding references' }));

  // G10-04 text/json readonly
  await A('选择notes.txt', 'click', 'notes.txt', () => ensureFile('notes.txt', 'data'));
  const r4a = await R('notes预览正文', 'rich.notes', scope, 'preview', async () => { const p = await previewInfo(); return { value: p.text, raw: { has: p.text.includes('FAST_NOTES') } }; });
  await A('选择records.json', 'click', 'records.json', () => ensureFile('records.json', 'data'));
  const r4b = await R('JSON预览正文', 'rich.json', scope, 'preview', async () => { const p = await previewInfo(); return { value: p.text, raw: { has: p.text.includes('FAST_JSON') } }; });
  const r4c = await R('文件预览可编辑控件数', 'rich.editables', scope, 'preview editables', async () => { const p = await previewInfo(); return { value: p.editables, raw: { editables: p.editables } }; });

  // G10-05 image preview
  await A('选择assets/icon.png', 'click', 'icon.png', () => ensureFile('icon.png', 'assets'));
  const r5 = await R('包内图片预览加载', 'rich.icon', scope, 'preview img', async () => { const p = await previewInfo(); const im = p.imgs.find(i => i.complete && i.nw > 0); return { value: !!im, raw: { imgs: p.imgs }, derivation: 'preview img complete && naturalWidth>0' }; });

  // G10-06 binary
  await A('选择data/sample.bin', 'click', 'sample.bin', () => ensureFile('sample.bin', 'data'));
  const r6a = await R('二进制文件说明', 'rich.bin.info', scope, 'preview', async () => { const p = await previewInfo(); const t = p.text; const has = /sample\.bin/.test(t) && /(B|KB|MB|字节)/.test(t); return { value: has, raw: { text: t.slice(-400) }, derivation: 'name and size/type present' }; });
  const r6b = await R('二进制正文解析声称', 'rich.bin.parse', scope, 'preview', async () => { const p = await previewInfo(); const claims = /解析成功|已解析|内容如下/.test(p.text); return { value: claims, raw: { tail: p.text.slice(-300) }, derivation: 'claims parsed business content' }; });

  // G10-07 valid external modify
  const rHashBefore = await FR('本轮实际安装SKILL.md绝对路径', SKILL_MD, '本轮实际安装目录', SKILL_MD, () => ({ value: hash(SKILL_MD) }));
  const orig = fs.readFileSync(SKILL_MD, 'utf8');
  await A('外部合法修改SKILL.md', 'file-write', 'FAST_RICH_BASE_OK->FAST_RICH_NEW_OK', async () => { fs.writeFileSync(SKILL_MD, orig.replace('FAST_RICH_BASE_OK', 'FAST_RICH_NEW_OK'), 'utf8'); await sleep(500); });
  await setSkillEnabled(true);
  const term7 = await callRich('FAST_RICH_NEW_OK');
  const r7a = await R('合法修改后的新任务正文', 'rich.newreply', '主任务视图/助手正文', SEL.assistant, async () => ({ value: (await lastAssistantText(page)).trim(), raw: { terminalOk: term7.ok, ms: term7.ms } }));
  const r7b = await R('新任务加载技能资源内容', 'rich.newtrace', '主任务视图/轨迹', 'trace', async () => { const t = await page.evaluate(() => document.body.innerText.slice(0, 60000)); return { value: t, raw: { has: t.includes('FAST_RICH_NEW_OK') } }; });
  await A('恢复SKILL.md', 'file-write', 'restore', async () => { fs.writeFileSync(SKILL_MD, orig, 'utf8'); await sleep(500); });
  const rHashAfter = await FR('本轮实际安装SKILL.md绝对路径', SKILL_MD, '本轮实际安装目录', SKILL_MD, () => ({ value: hash(SKILL_MD) }));

  // G10-08 invalid modify
  const rHash8Before = await FR('本轮实际安装SKILL.md绝对路径', SKILL_MD, '本轮实际安装目录', SKILL_MD, () => ({ value: hash(SKILL_MD) }));
  await A('外部无效修改SKILL.md', 'file-write', 'remove description', async () => { fs.writeFileSync(SKILL_MD, orig.replace(/\ndescription: "Harmless package regression fixture"/, ''), 'utf8'); await sleep(500); });
  await openRich();
  const r8a = await R('无效文件校验提示', 'rich.invalid.prompt', scope, 'detail', async () => { const p = await previewInfo(); const t = p.text; const warn = /无效|缺少|校验|必须|必填|description|错误|异常/.test(t); return { value: warn, raw: { text: t.slice(0, 500) }, derivation: 'detail shows validation warning' }; });
  const term8 = await callRich('FAST_RICH_BASE_OK');
  const r8b = await R('无效修改后的固定回复', 'rich.invalid.reply', '主任务视图/助手正文', SEL.assistant, async () => ({ value: (await lastAssistantText(page)).trim(), raw: { terminalOk: term8.ok } }));
  await A('恢复SKILL.md(无效修改后)', 'file-write', 'restore', async () => { fs.writeFileSync(SKILL_MD, orig, 'utf8'); await sleep(500); });
  const rHash8After = await FR('本轮实际安装SKILL.md绝对路径', SKILL_MD, '本轮实际安装目录', SKILL_MD, () => ({ value: hash(SKILL_MD) }));

  // G10-09 card local-modified label
  await refresh(); await back(); await setSearch(RICH);
  const r9 = await R('本轮卡片已本地修改标签', 'rich.localmod', scope, 'card tags', async () => { const t = await f.evaluate(() => { const c = document.querySelector('[data-slot="card"]'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; }); const has = /本地修改|已修改/.test(t); return { value: has, raw: { cardText: t.slice(0, 200) }, derivation: 'card shows a local-modified label' }; });
  await setSearch(''); await back();
  await setSkillEnabled(false);

  const ended = new Date().toISOString();
  fs.writeFileSync(path.join(root, 'tools', 'run', 'scratch', 'g10-run.json'), JSON.stringify(out, null, 2), 'utf8');
  const ev = evidenceFor(g);
  const mk = (id, object_identity, inputs, steps, assertions, cleanup) => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, attempt_id: 'G10-A01', environment_id: environmentId, evidence: ev, started_at: t0, ended_at: ended, action_refs: actionRefs, cleanup: cleanup || { status: 'restored', description: 'rich安装SKILL.md已恢复原字节', read_refs: [] }, notes: 'G10基于rich安装对象。' });
  mk('G10-01', 'rich技能详情', [], ['打开详情'], [{ id: 'G10-01-A1', actual: r1a.value, read_refs: [r1a.event_id] }, { id: 'G10-01-A2', actual: r1b.value, read_refs: [r1b.event_id] }]);
  mk('G10-02', 'rich技能详情', [], ['展开深层选择checklist.md'], [{ id: 'G10-02-A1', actual: r2.value, read_refs: [r2.event_id] }]);
  mk('G10-03', 'rich技能详情', [], ['收起再展开'], [{ id: 'G10-03-A1', actual: r3a.value, read_refs: [r3a.event_id] }, { id: 'G10-03-A2', actual: r3b.value, read_refs: [r3b.event_id] }]);
  mk('G10-04', 'rich技能详情', [], ['点notes/json'], [{ id: 'G10-04-A1', actual: r4a.value, read_refs: [r4a.event_id] }, { id: 'G10-04-A2', actual: r4b.value, read_refs: [r4b.event_id] }, { id: 'G10-04-A3', actual: r4c.value, read_refs: [r4c.event_id] }]);
  mk('G10-05', 'rich技能详情', [], ['点icon.png'], [{ id: 'G10-05-A1', actual: r5.value, read_refs: [r5.event_id] }]);
  mk('G10-06', 'rich技能详情', [], ['点sample.bin'], [{ id: 'G10-06-A1', actual: r6a.value, read_refs: [r6a.event_id] }, { id: 'G10-06-A2', actual: r6b.value, read_refs: [r6b.event_id] }]);
  mk('G10-07', 'rich实际安装SKILL.md', ['FAST_RICH_NEW_OK'], ['外部修改并调用', '恢复'], [{ id: 'G10-07-A1', actual: r7a.value, read_refs: [r7a.event_id] }, { id: 'G10-07-A2', actual: r7b.value, read_refs: [r7b.event_id] }, { id: 'G10-07-A3', actual: { before: rHashBefore.value, after: rHashAfter.value }, read_refs: [rHashBefore.event_id, rHashAfter.event_id] }]);
  mk('G10-08', 'rich实际安装SKILL.md', ['移除description'], ['无效修改并调用', '恢复'], [{ id: 'G10-08-A1', actual: r8a.value, read_refs: [r8a.event_id] }, { id: 'G10-08-A2', actual: r8b.value, read_refs: [r8b.event_id] }, { id: 'G10-08-A3', actual: { before: rHash8Before.value, after: rHash8After.value }, read_refs: [rHash8Before.event_id, rHash8After.event_id] }]);
  mk('G10-09', 'rich技能卡片', [], ['读取卡片标签'], [{ id: 'G10-09-A1', actual: r9.value, read_refs: [r9.event_id] }]);
  console.log(JSON.stringify({ r1: [r1a.value, r1b.raw.has], r2: r2.raw.has, r3: [r3a.value, r3b.value], r4: [r4a.raw.has, r4b.raw.has, r4c.value], r5: r5.value, r6: [r6a.value, r6b.value], r7: [r7a.value, r7b.raw.has, rHashBefore.value === rHashAfter.value], r8: [r8a.value, r8b.value, rHash8Before.value === rHash8After.value], r9: r9.value }, null, 2));
});
