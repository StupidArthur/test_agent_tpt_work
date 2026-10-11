import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { withApp, sleep, root, environmentId, evidenceFor, finalizeCase, expertsFrame, closeSettings, newTask, waitTerminal, lastAssistantText, SEL, fixtureRoot } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G11';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, locatorOrFn, fnOr) => { const locator = typeof locatorOrFn === 'function' ? scope : locatorOrFn; const fn = typeof locatorOrFn === 'function' ? locatorOrFn : fnOr; return log.read(target, object_id, { channel: 'dom', scope, locator }, fn); };
const FR = (target, object_id, scope, locator, fn) => log.read(target, object_id, { channel: 'file', scope, locator }, fn);
const EXP = d => path.join(fixtureRoot, 'experts', d);
const fixtureRootPath = path.join(root, '夹具', '本轮', '20261006-oc1');
const EXP2 = d => path.join(fixtureRootPath, 'experts', d);
const AGENTS = 'C:\\Users\\Administrator\\.tpt-work\\agents';
const LONG = path.join(AGENTS, 'fast-assert-expert-longread-20261006-oc1');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const out = {};

await withApp(async (page) => {
  const scope = '专家iframe/supcon-agents';
  await closeSettings(page);
  let f = await expertsFrame(page);
  const refresh = async () => { f = await expertsFrame(page); };
  const isDetail = () => f.evaluate(() => /专家详情/.test(document.body.innerText));
  const back = async () => { for (let i = 0; i < 3; i++) { if (!(await isDetail())) return; await f.getByRole('button', { name: '专家', exact: true }).first().click({ timeout: 5000 }).catch(() => {}); await sleep(800); } };
  const closeDialogs = async () => { for (let i = 0; i < 4; i++) { const has = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some(e => e.offsetWidth)); if (!has) break; await f.getByRole('button', { name: '取消', exact: true }).first().click({ timeout: 3000 }).catch(() => {}); await page.keyboard.press('Escape').catch(() => {}); await sleep(400); } };
  const importExpert = async (dir, choice) => {
    await refresh(); await back(); await closeDialogs();
    await f.getByRole('button', { name: '导入专家', exact: true }).click({ timeout: 8000 }); await sleep(1000);
    await f.locator('input[type="file"][webkitdirectory]').first().setInputFiles(dir); await sleep(800);
    await f.getByRole('button', { name: '提交', exact: true }).click({ timeout: 8000 }); await sleep(2000);
    if (choice) { const b = f.getByRole('button', { name: choice, exact: true }); if (await b.count()) { await b.click({ timeout: 5000 }); await sleep(2500); } }
    const dlg = await f.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(e => e.offsetWidth); return d ? d.innerText.replace(/\s+/g, ' ') : '(closed)'; });
    const open = await f.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some(e => e.offsetWidth));
    await closeDialogs();
    return { dlg, open };
  };
  const openExpert = async (name) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      await refresh(); await back();
      const cards = f.locator('._card_c5z1c_2');
      const n = await cards.count();
      for (let i = 0; i < n; i++) {
        await cards.nth(i).locator('div.cursor-pointer').first().click({ timeout: 5000 }).catch(async () => { await cards.nth(i).click({ timeout: 5000 }); });
        await sleep(900);
        const d = await f.evaluate(() => { const t = document.body.innerText; if (!/专家详情/.test(t)) return null; return { name: (t.match(/name:\s*([^\s]+)/) || [])[1] || null, text: t }; });
        if (d && d.name === name) return d;
        await back();
      }
    }
    return null;
  };
  const detailFields = async (name) => { const d = await openExpert(name); if (!d) return null; const lines = d.text.split('\n').map(s => s.trim()).filter(Boolean); const i = lines.indexOf('专家详情'); return { title: i >= 0 ? lines[i + 1] : null, desc: i >= 0 ? lines[i + 2] : null, text: d.text, name: d.name }; };

  // G11-01 minimal
  await A('导入minimal专家', 'setInputFiles+click', 'minimal', () => importExpert(EXP2('minimal')));
  const dMin = await openExpert('fast-assert-expert-minimal-20261006-oc1'); await back();
  const r1 = await R('minimal专家存在', 'expert.minimal.exists', scope, 'detail name', async () => ({ value: !!(dMin && dMin.name === 'fast-assert-expert-minimal-20261006-oc1'), raw: { name: dMin && dMin.name }, derivation: 'detail internal name matches' }));

  // G11-02 en-description
  await A('导入en-description专家', 'setInputFiles+click', 'en-description', () => importExpert(EXP2('en-description')));
  const dEn = await detailFields('fast-assert-expert-en-description-20261006-oc1'); await back();
  const r2 = await R('en-description实际简介', 'expert.en.desc', scope, 'detail desc', async () => ({ value: dEn ? dEn.desc : null, raw: { desc: dEn && dEn.desc } }));

  // G11-03 base-description
  await A('导入base-description专家', 'setInputFiles+click', 'base-description', () => importExpert(EXP2('base-description')));
  const dBase = await detailFields('fast-assert-expert-base-description-20261006-oc1'); await back();
  const r3 = await R('base-description实际简介', 'expert.base.desc', scope, 'detail desc', async () => ({ value: dBase ? dBase.desc : null, raw: { desc: dBase && dBase.desc } }));

  // G11-04 longread prompt end
  await A('导入longread专家', 'setInputFiles+click', 'longread', () => importExpert(EXP2('longread'), '覆盖现有'));
  const dLong = await detailFields('fast-assert-expert-longread-20261006-oc1');
  const r4a = await R('长提示词完整正文', 'expert.long.prompt', scope, 'detail prompt', async () => ({ value: dLong ? dLong.text : '', raw: { hasEnd: /FAST_PROMPT_END/.test(dLong ? dLong.text : '') } }));
  await A('滚动提示词至底部', 'scroll', 'prompt', async () => { await f.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); if (p) { const sc = [...p.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight); sc.forEach(e => e.scrollTop = e.scrollHeight); } }); await sleep(800); });
  const r4b = await R('末尾标记可见', 'expert.long.end.visible', scope, 'prompt end marker', async () => { const v = await f.evaluate(() => { const p = document.querySelector('[class*="_page_"]'); if (!p) return false; const leaf = [...p.querySelectorAll('*')].find(e => e.children.length === 0 && /FAST_PROMPT_END/.test(e.textContent || '')); return leaf ? !!(leaf.offsetWidth || leaf.offsetHeight) : false; }); return { value: v, raw: { visible: v }, derivation: 'FAST_PROMPT_END leaf offsetWidth>0' }; });
  await back();

  // G11-05 overwrite longread
  const metaPath = path.join(LONG, 'metadata.json');
  const rMetaBefore = await FR('本轮原安装metadata.json绝对路径', metaPath, '本轮原安装专家目录', metaPath, () => ({ value: hash(metaPath) }));
  const origMeta = fs.readFileSync(metaPath, 'utf8');
  await A('导入overwrite并选择覆盖', 'setInputFiles+click', 'overwrite', () => importExpert(EXP2('overwrite'), '覆盖现有'));
  const installedMeta = fs.readFileSync(metaPath, 'utf8');
  const r5a = await FR('覆盖后实际metadata内容', metaPath, '本轮原安装专家目录', metaPath, () => ({ value: installedMeta }));
  const dOver = await detailFields('fast-assert-expert-longread-20261006-oc1'); await back();
  const r5b = await R('覆盖后详情描述', 'expert.overwrite.desc', scope, 'detail desc', async () => ({ value: dOver ? dOver.desc : null, raw: { desc: dOver && dOver.desc } }));
  await A('恢复longread原metadata', 'file-write', 'restore', async () => { fs.writeFileSync(metaPath, origMeta, 'utf8'); await sleep(500); });
  const rMetaAfter = await FR('本轮原安装metadata.json绝对路径', metaPath, '本轮原安装专家目录', metaPath, () => ({ value: hash(metaPath) }));

  // G11-06 bundled
  await A('导入bundled专家', 'setInputFiles+click', 'bundled', () => importExpert(EXP2('bundled')));
  const bundledInstall = path.join(AGENTS, 'fast-assert-expert-bundled-20261006-oc1', 'skills', 'bundled', 'SKILL.md');
  const r6a = await FR('实际安装附带SKILL.md', bundledInstall, '本轮安装专家目录', bundledInstall, () => ({ value: fs.existsSync(bundledInstall), raw: { path: bundledInstall, exists: fs.existsSync(bundledInstall) }, derivation: 'installed skills/bundled/SKILL.md exists' }));
  const r6b = await FR('源包与安装附带Skill文件路径', 'bundled.source', '源包', path.join(fixtureRootPath, 'experts', 'bundled', 'skills', 'bundled', 'SKILL.md'), () => ({ value: path.join(fixtureRootPath, 'experts', 'bundled', 'skills', 'bundled', 'SKILL.md') }));
  const r6c = await FR('安装附带Skill文件路径', 'bundled.install', '安装目录', bundledInstall, () => ({ value: bundledInstall }));

  // G11-07 bundled call
  await openExpert('fast-assert-expert-bundled-20261006-oc1');
  await A('bundled详情使用', 'click', '使用', async () => { await f.getByRole('button', { name: '使用', exact: true }).click({ timeout: 8000 }); await sleep(2500); });
  await closeSettings(page); await page.getByRole('tab', { name: '对话', exact: true }).click({ timeout: 5000 }).catch(() => {}); await sleep(500);
  await A('请求执行内置技能', 'type+click', '请执行内置技能固定规则', async () => { const c = page.locator(SEL.composer).first(); await c.click({ timeout: 8000 }); await page.keyboard.press('End'); await page.keyboard.type('请执行内置技能固定规则'); await sleep(400); const send = page.locator(SEL.send).first(); for (let i = 0; i < 30; i++) { if (!(await send.isDisabled().catch(() => true))) break; await sleep(300); } await send.click({ timeout: 8000 }); });
  const term7 = await waitTerminal(page, { expect: 'FAST_BUNDLED_OK', timeout: 120000 });
  const r7a = await R('本轮成功加载资源正文', 'bundled.trace', '主任务视图/轨迹', 'trace', async () => { const t = await page.evaluate(() => document.body.innerText.slice(0, 60000)); return { value: t, raw: { has: t.includes('FAST_BUNDLED_OK') } }; });
  const r7b = await R('本轮助手正文', 'bundled.reply', '主任务视图/助手正文', SEL.assistant, async () => ({ value: (await lastAssistantText(page)).trim(), raw: { terminalOk: term7.ok } }));
  const r7c = await R('请求含输出串', 'bundled.user', '用户请求元素', 'leaf', async () => { const t = await page.evaluate(() => [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent || '').includes('请执行内置技能固定规则')).map(e => e.textContent.trim())[0] || ''); return { value: t.includes('FAST_BUNDLED_OK'), raw: { userText: t }, derivation: 'user request element contains FAST_BUNDLED_OK' }; });

  // G11-08 edit context
  const sendMsg = async (text) => { const c = page.locator(SEL.composer).first(); if (!(await c.count())) return false; await c.click({ timeout: 8000 }).catch(() => {}); await page.keyboard.press('End'); await page.keyboard.type(text); await sleep(400); const send = page.locator(SEL.send).first(); for (let i = 0; i < 30; i++) { if (!(await send.isDisabled().catch(() => true))) break; await sleep(300); } await send.click({ timeout: 8000 }).catch(() => {}); return true; };
  const dEdit = await openExpert('fast-assert-expert-longread-20261006-oc1');
  const onDetail8 = await isDetail();
  await A('longread对话修改', 'click', '对话修改', async () => { if (onDetail8) { await f.getByRole('button', { name: '对话修改', exact: true }).click({ timeout: 6000 }).catch(() => {}); await sleep(2500); } });
  await closeSettings(page); await page.getByRole('tab', { name: '对话', exact: true }).click({ timeout: 5000 }).catch(() => {}); await sleep(500);
  const r8a = await R('专家编辑引用身份', 'edit.ref', 'composer', 'chip', async () => { const t = await page.evaluate(() => { const c = document.querySelector('[contenteditable="true"]'); const ch = c && c.querySelector('[data-composer-chip] [title]'); return { chip: ch ? ch.getAttribute('title') : null, text: (c && c.innerText || '').trim() }; }); return { value: /fast-assert-expert-longread-20261006-oc1/.test((t.chip || '') + t.text), raw: t, derivation: 'composer references longread expert' }; });
  const r8b = await R('专家编辑模式', 'edit.mode', '主任务视图', 'mode marker', async () => { const t = await page.evaluate(() => document.body.innerText.slice(0, 4000)); const has = /编辑专家|专家编辑|修改专家/.test(t); return { value: has, raw: { snippet: t.slice(0, 300) }, derivation: 'edit-mode semantics present' }; });
  const r8c = await R('左侧导航保留', 'edit.nav', '左侧栏', 'sidebar', async () => { const v = await page.locator('.YDXeBa_projectRow, [class*="tpt-sidebar"]').first().isVisible().catch(() => false); return { value: v, raw: { visible: v }, derivation: 'sidebar visible' }; });

  // G11-09 plan without write
  const agentMd = path.join(LONG, 'agent.md');
  const r9aBefore = await FR('本轮安装agent.md绝对路径', agentMd, '本轮原安装专家目录', agentMd, () => ({ value: hash(agentMd) }));
  const r9bBefore = await FR('本轮安装metadata.json绝对路径', metaPath, '本轮原安装专家目录', metaPath, () => ({ value: hash(metaPath) }));
  await A('发送仅提方案请求', 'type+click', '仅提方案', () => sendMsg('请只提出方案：将此专家metadata.json的displayDescription.zh改为FAST_EDITED，暂不写入任何文件，等待我确认。'));
  const term9 = await waitTerminal(page, { timeout: 120000 });
  const r9c = await R('待确认摘要', 'edit.plan', '主任务视图/助手正文', SEL.assistant, async () => { const t = (await lastAssistantText(page)).trim(); return { value: t, raw: { hasField: /displayDescription\.zh/.test(t), terminalOk: term9.ok } }; });
  const r9aAfter = await FR('本轮安装agent.md绝对路径', agentMd, '本轮原安装专家目录', agentMd, () => ({ value: hash(agentMd) }));
  const r9bAfter = await FR('本轮安装metadata.json绝对路径', metaPath, '本轮原安装专家目录', metaPath, () => ({ value: hash(metaPath) }));

  // G11-10 confirm write
  await A('确认写入请求', 'type+click', '确认修改', () => sendMsg('确认：仅将本轮longread的displayDescription.zh改为FAST_EDITED，其他字段与文件不变。'));
  const term10 = await waitTerminal(page, { timeout: 120000 });
  const r10a = await FR('修改后metadata.displayDescription.zh', metaPath, '本轮原安装专家目录', metaPath, () => { try { const j = JSON.parse(fs.readFileSync(metaPath, 'utf8')); return { value: j.displayDescription ? j.displayDescription.zh : null, raw: { zh: j.displayDescription && j.displayDescription.zh } }; } catch (e) { return { value: null, raw: { error: e.message } }; } });
  const r10b = await R('修改摘要字段正确', 'edit.summary', '主任务视图/助手正文', SEL.assistant, async () => { const t = (await lastAssistantText(page)).trim(); return { value: t, raw: { hasField: /displayDescription\.zh/.test(t), terminalOk: term10.ok } }; });
  // restore
  await A('恢复metadata描述', 'file-write', 'restore original', async () => { fs.writeFileSync(metaPath, origMeta, 'utf8'); await sleep(500); });
  const r10c = await FR('恢复后metadata描述', metaPath, '本轮原安装专家目录', metaPath, () => { const j = JSON.parse(fs.readFileSync(metaPath, 'utf8')); return { value: j.displayDescription ? j.displayDescription.zh : null, raw: { zh: j.displayDescription && j.displayDescription.zh } }; });

  // G11-11 external agent.md refresh
  const r11aBefore = await FR('本轮安装agent.md绝对路径', agentMd, '本轮原安装专家目录', agentMd, () => ({ value: hash(agentMd) }));
  const origAgent = fs.readFileSync(agentMd, 'utf8');
  await A('外部追加刷新标记', 'file-write', 'append FAST_EXTERNAL_REFRESH', async () => { fs.writeFileSync(agentMd, origAgent + '\nFAST_EXTERNAL_REFRESH\n', 'utf8'); await sleep(500); });
  const dRef = await detailFields('fast-assert-expert-longread-20261006-oc1'); await back();
  const r11 = await R('刷新后提示词正文', 'expert.refresh.prompt', scope, 'detail', async () => ({ value: dRef ? dRef.text : '', raw: { has: /FAST_EXTERNAL_REFRESH/.test(dRef ? dRef.text : '') } }));
  await A('恢复agent.md', 'file-write', 'restore', async () => { fs.writeFileSync(agentMd, origAgent, 'utf8'); await sleep(500); });
  const r11After = await FR('本轮安装agent.md绝对路径', agentMd, '本轮原安装专家目录', agentMd, () => ({ value: hash(agentMd) }));

  // G11-12 bad json not rewritten
  const r12Before = await FR('本轮坏metadata.json绝对路径', metaPath, '本轮原安装专家目录', metaPath, () => ({ value: hash(metaPath) }));
  await A('写入坏JSON', 'file-write', '{ invalid', async () => { fs.writeFileSync(metaPath, '{ invalid', 'utf8'); await sleep(500); });
  const badHash = await FR('本轮坏metadata.json绝对路径', metaPath, '本轮原安装专家目录', metaPath, () => ({ value: hash(metaPath) }));
  const dBad = await detailFields('fast-assert-expert-longread-20261006-oc1'); await back();
  const r12a = await R('坏JSON校验提示', 'expert.badjson.prompt', scope, 'detail', async () => { const t = dBad ? dBad.text : ''; const warn = /无效|格式|校验|错误|JSON|解析/.test(t); return { value: warn, raw: { text: t.slice(0, 400) }, derivation: 'detail shows format/validation error' }; });
  const badHashAfter = await FR('本轮坏metadata.json绝对路径', metaPath, '本轮原安装专家目录', metaPath, () => ({ value: hash(metaPath) }));
  await A('恢复metadata原字节', 'file-write', 'restore', async () => { fs.writeFileSync(metaPath, origMeta, 'utf8'); await sleep(500); });
  const dOk = await detailFields('fast-assert-expert-longread-20261006-oc1'); await back();
  const r12c = await R('恢复后对象详情可访问', 'expert.restored.detail', scope, 'detail', async () => ({ value: !!(dOk && dOk.name), raw: { name: dOk && dOk.name }, derivation: 'valid detail accessible' }));

  const ended = new Date().toISOString();
  fs.writeFileSync(path.join(root, 'tools', 'run', 'scratch', 'g11-run.json'), JSON.stringify(out, null, 2), 'utf8');
  const ev = evidenceFor(g);
  const mk = (id, object_identity, inputs, steps, assertions, cleanup) => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, attempt_id: 'G11-A01', environment_id: environmentId, evidence: ev, started_at: t0, ended_at: ended, action_refs: actionRefs, cleanup: cleanup || { status: 'restored', description: '专家安装文件已恢复原字节', read_refs: [] }, notes: 'G11基于本轮专家样本。' });
  mk('G11-01', 'minimal专家', ['minimal'], ['导入'], [{ id: 'G11-01-A1', actual: r1.value, read_refs: [r1.event_id] }]);
  mk('G11-02', 'en-description专家', ['en-description'], ['导入读简介'], [{ id: 'G11-02-A1', actual: r2.value, read_refs: [r2.event_id] }]);
  mk('G11-03', 'base-description专家', ['base-description'], ['导入读简介'], [{ id: 'G11-03-A1', actual: r3.value, read_refs: [r3.event_id] }]);
  mk('G11-04', 'longread专家', ['longread'], ['导入读提示词并滚到底'], [{ id: 'G11-04-A1', actual: r4a.value, read_refs: [r4a.event_id] }, { id: 'G11-04-A2', actual: r4b.value, read_refs: [r4b.event_id] }]);
  mk('G11-05', 'longread安装metadata.json', ['overwrite'], ['覆盖导入并恢复'], [{ id: 'G11-05-A1', actual: r5a.value, read_refs: [r5a.event_id] }, { id: 'G11-05-A2', actual: r5b.value, read_refs: [r5b.event_id] }, { id: 'G11-05-A3', actual: { before: rMetaBefore.value, after: rMetaAfter.value }, read_refs: [rMetaBefore.event_id, rMetaAfter.event_id] }]);
  mk('G11-06', 'bundled安装专家', ['bundled'], ['导入读附带skill'], [{ id: 'G11-06-A1', actual: r6a.value, read_refs: [r6a.event_id] }, { id: 'G11-06-A2', actual: { before: r6b.value, after: r6c.value }, read_refs: [r6b.event_id, r6c.event_id] }]);
  mk('G11-07', 'bundled专家调用', ['请执行内置技能固定规则'], ['使用并调用'], [{ id: 'G11-07-A1', actual: r7a.value, read_refs: [r7a.event_id] }, { id: 'G11-07-A2', actual: r7b.value, read_refs: [r7b.event_id] }, { id: 'G11-07-A3', actual: r7c.value, read_refs: [r7c.event_id] }]);
  mk('G11-08', 'longread编辑会话', ['对话修改'], ['进入编辑观察'], [{ id: 'G11-08-A1', actual: r8a.value, read_refs: [r8a.event_id] }, { id: 'G11-08-A2', actual: r8b.value, read_refs: [r8b.event_id] }, { id: 'G11-08-A3', actual: r8c.value, read_refs: [r8c.event_id] }]);
  mk('G11-09', 'longread安装文件', ['仅提方案'], ['提方案前后哈希'], [{ id: 'G11-09-A1', actual: { before: r9aBefore.value, after: r9aAfter.value }, read_refs: [r9aBefore.event_id, r9aAfter.event_id] }, { id: 'G11-09-A2', actual: { before: r9bBefore.value, after: r9bAfter.value }, read_refs: [r9bBefore.event_id, r9bAfter.event_id] }, { id: 'G11-09-A3', actual: r9c.value, read_refs: [r9c.event_id] }]);
  mk('G11-10', 'longread安装metadata.json', ['确认修改'], ['确认写入并恢复'], [{ id: 'G11-10-A1', actual: r10a.value, read_refs: [r10a.event_id] }, { id: 'G11-10-A2', actual: r10b.value, read_refs: [r10b.event_id] }, { id: 'G11-10-A3', actual: r10c.value, read_refs: [r10c.event_id] }]);
  mk('G11-11', 'longread安装agent.md', ['追加刷新标记'], ['外部修改刷新并恢复'], [{ id: 'G11-11-A1', actual: r11.value, read_refs: [r11.event_id] }, { id: 'G11-11-A2', actual: { before: r11aBefore.value, after: r11After.value }, read_refs: [r11aBefore.event_id, r11After.event_id] }]);
  mk('G11-12', 'longread安装metadata.json', ['坏JSON'], ['写坏刷新并恢复'], [{ id: 'G11-12-A1', actual: r12a.value, read_refs: [r12a.event_id] }, { id: 'G11-12-A2', actual: { before: badHash.value, after: badHashAfter.value }, read_refs: [badHash.event_id, badHashAfter.event_id] }, { id: 'G11-12-A3', actual: r12c.value, read_refs: [r12c.event_id] }]);
  console.log(JSON.stringify({ r1: r1.value, r2: r2.value, r3: r3.value, r4: [r4a.raw.hasEnd, r4b.value], r5: [r5a.value.includes('FAST_OVERWRITE'), r5b.value, rMetaBefore.value === rMetaAfter.value], r6: [r6a.value, r6b.value !== r6c.value], r7: [r7a.raw.has, r7b.value, r7c.value], r8: [r8a.value, r8b.value, r8c.value], r9: [r9aBefore.value === r9aAfter.value, r9bBefore.value === r9bAfter.value, r9c.raw.hasField], r10: [r10a.value, r10b.raw.hasField, r10c.value], r11: [r11.raw.has, r11aBefore.value === r11After.value], r12: [r12a.value, badHash.value === badHashAfter.value, r12c.value] }, null, 2));
});
