import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { withApp, sleep, root, environmentId, evidenceFor, finalizeCase, fixtureRoot, closeSettings, newTask, typeAndSend, waitTerminal, SEL } from './lib.mjs';
const require = createRequire(import.meta.url);
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));

const g = 'G7';
const log = createRecorder(root, { environment_id: environmentId, group: g });
const t0 = new Date().toISOString();
const actionRefs = [];
const A = async (target, action, input, fn) => { const e = await log.action(target, action, input, fn); actionRefs.push(e.event_id); return e; };
const R = (target, object_id, scope, locatorOrFn, fnOr) => { const locator = typeof locatorOrFn === 'function' ? scope : locatorOrFn; const fn = typeof locatorOrFn === 'function' ? locatorOrFn : fnOr; return log.read(target, object_id, { channel: 'dom', scope, locator }, fn); };
const att = (n) => path.join(fixtureRoot, 'attachments', n);
const counts = Array.from({ length: 35 }, (_, i) => att(path.join('count', `count-${String(i + 1).padStart(2, '0')}.txt`)));
const out = {};

await withApp(async (page) => {
  const scope = '主任务视图/composer附件区';
  const clearAll = async () => {
    for (let r = 0; r < 4; r++) {
      const btns = page.locator('[role="group"][aria-label="待发送附件"] button[aria-label^="移除文件"], [role="group"][aria-label="待发送附件"] button[aria-label^="移除图片"]');
      const n = await btns.count(); if (!n) break;
      for (let i = 0; i < n; i++) { await btns.first().click({ timeout: 3000 }).catch(() => {}); await sleep(120); }
      await sleep(500);
    }
    await page.locator(SEL.composer).first().fill('').catch(() => {});
  };
  const names = () => page.evaluate(() => [...document.querySelectorAll('[role="group"][aria-label="待发送附件"] [class*="_name"]')].map(e => (e.textContent || '').trim()));
  const itemCount = () => page.locator('[role="group"][aria-label="待发送附件"] [class*="_item"]').count();
  const areaText = () => page.evaluate(() => { const a = document.querySelector('[data-slot="conversation.input.attachments"]'); return a ? a.innerText.replace(/\s+/g, ' ').trim() : ''; });
  const addFiles = async (paths) => { await page.locator('input[type="file"]').first().setInputFiles(paths); await sleep(1600); };
  const freshTask = async () => { await closeSettings(page); await newTask(page); await clearAll(); };

  // G7-01 three files order
  await freshTask();
  await A('添加三文件附件', 'setInputFiles', 'a/b/c', () => addFiles([att('attachment-a.txt'), att('attachment-b.txt'), att('attachment-c.md')]));
  const r1 = await R('当前草稿附件名顺序', 'composer.attachments.names', scope, '[aria-label=待发送附件] .name', async () => ({ value: await names(), raw: { names: await names(), areaText: await areaText() } }));

  // G7-02 30 boundary
  await freshTask();
  await A('添加30附件', 'setInputFiles', 'count-01..30', () => addFiles(counts.slice(0, 30)));
  const r2a = await R('当前草稿附件数', 'composer.attachments.count', scope, '[aria-label=待发送附件] item count', async () => ({ value: await itemCount(), raw: { count: await itemCount() } }));
  const r2b = await R('附件数量提示', 'composer.attachments.hint', scope, 'area text', async () => { const t = await areaText(); const m = t.match(/(\d+)\s*\/\s*(\d+)/); return { value: !!m && m[1] === '30' && m[2] === '30', raw: { areaText: t.slice(0, 200), match: m ? m[0] : null }, derivation: 'area text contains 30/30' }; });

  // G7-03 over-limit batch
  await freshTask();
  await A('添加01至20', 'setInputFiles', 'count-01..20', () => addFiles(counts.slice(0, 20)));
  const beforeNames = await names();
  const r3before = await R('当前草稿附件完整文件名列表', 'composer.attachments.names.before', scope, 'names', async () => ({ value: beforeNames, raw: { names: beforeNames } }));
  await A('再次提交21至35', 'setInputFiles', 'count-21..35', () => addFiles(counts.slice(20, 35)));
  const afterNames = await names();
  const r3after = await R('当前草稿附件完整文件名列表', 'composer.attachments.names.before', scope, 'names', async () => ({ value: afterNames, raw: { names: afterNames } }));
  const r3hint = await R('超额提示', 'composer.attachments.overlimit', scope, 'area/body text', async () => {
    const t = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const hit = /(超额|超出|最多|上限|剩余|可再|还能|只能)/.test(t) && /10/.test(t);
    return { value: hit, raw: { snippet: (t.match(/.{0,40}(超额|超出|最多|上限|剩余|可再|还能|只能).{0,40}/) || [''])[0] }, derivation: 'over-limit wording plus 10 present' };
  });

  // G7-04 image thumbnail
  await freshTask();
  await A('添加preview.png', 'setInputFiles', 'preview.png', () => addFiles([att('preview.png')]));
  const r4 = await R('preview.png附件图像', 'composer.attachments.image', scope, 'area img', async () => {
    const raw = await page.evaluate(() => { const a = document.querySelector('[data-slot="conversation.input.attachments"]'); const i = a && a.querySelector('img'); return i ? { complete: i.complete, naturalWidth: i.naturalWidth } : null; });
    return { value: !!(raw && raw.complete && raw.naturalWidth > 0), raw, derivation: 'img.complete && naturalWidth>0' };
  });

  // G7-05 image full preview
  await A('点击缩略图打开预览', 'click', 'thumbnail', async () => { await page.locator('[data-slot="conversation.input.attachments"] button[class*="thumbnail"]').first().click({ timeout: 6000 }); await sleep(1500); });
  const r5a = await R('图片预览层', 'composer.preview.layer', '主任务视图/预览层', '[class*=backdrop] img', async () => {
    const raw = await page.evaluate(() => { const b = [...document.querySelectorAll('[class*="backdrop"]')].find(e => e.offsetWidth); const i = b && b.querySelector('img'); return b ? { visible: true, complete: i ? i.complete : null, nw: i ? i.naturalWidth : null } : { visible: false }; });
    return { value: !!(raw.visible && raw.complete && raw.nw > 0), raw, derivation: 'visible backdrop with loaded image' };
  });
  await A('关闭图片预览', 'click', 'Escape', async () => { await page.keyboard.press('Escape'); await sleep(1000); });
  const r5b = await R('关闭后的图片预览层', 'composer.preview.closed', '主任务视图/预览层', '[class*=backdrop]', async () => { const n = await page.evaluate(() => [...document.querySelectorAll('[class*="backdrop"]')].filter(e => e.offsetWidth).length); return { value: n > 0, raw: { visibleLayers: n }, derivation: 'visible backdrop count > 0' }; });

  // G7-06 normal file
  await freshTask();
  await A('添加attachment-a.txt', 'setInputFiles', 'a.txt', () => addFiles([att('attachment-a.txt')]));
  const r6a = await R('attachment-a.txt卡片', 'composer.attachments.a', scope, 'card name', async () => { const n = await names(); return { value: n[0] ?? null, raw: { names: n } }; });
  const r6b = await R('普通文件图标', 'composer.attachments.a.icon', scope, 'card icon', async () => { const n = await page.evaluate(() => document.querySelectorAll('[role="group"][aria-label="待发送附件"] [class*="_icon"] svg').length); return { value: n > 0, raw: { iconCount: n }, derivation: 'icon svg count > 0' }; });

  // G7-07 unknown format
  await freshTask();
  await A('添加未知格式', 'setInputFiles', 'fixture.unknown-fast', () => addFiles([att('fixture.unknown-fast')]));
  const r7a = await R('未知格式附件卡', 'composer.attachments.unknown', scope, 'card count', async () => { const n = (await names()).filter(x => x === 'fixture.unknown-fast').length; return { value: n, raw: { names: await names() } }; });
  const r7b = await R('未知格式卡片解析声明', 'composer.attachments.unknown.parse', scope, 'card meta', async () => { const t = await areaText(); const claims = /解析成功|已解析|parsed/i.test(t); return { value: claims, raw: { areaText: t.slice(0, 150) }, derivation: 'card text claims parse success' }; });

  // G7-08 long filename tooltip
  await freshTask();
  const LONG = 'fast-assert-long-filename-for-layout-and-tooltip-complete-name-regression.txt';
  await A('添加长文件名', 'setInputFiles', LONG, () => addFiles([att(LONG)]));
  await A('悬停长文件名卡片', 'hover', LONG, async () => { await page.locator(`[class*="card"][title="${LONG}"]`).first().hover({ timeout: 5000 }).catch(() => {}); await sleep(800); });
  const r8 = await R('长文件名完整提示', 'composer.attachments.long.tooltip', scope, 'card title', async () => { const t = await page.evaluate((LONG) => { const c = [...document.querySelectorAll('[class*="card"]')].find(e => (e.getAttribute('title') || '').includes('long-filename')); return c ? c.getAttribute('title') : null; }, LONG); return { value: t, raw: { title: t } }; });

  // G7-09 scroll with 30
  await freshTask();
  await A('添加30附件用于滚动', 'setInputFiles', 'count-01..30', () => addFiles(counts.slice(0, 30)));
  const r9a = await R('附件容器可滚动', 'composer.attachments.scrollable', scope, 'rail', async () => {
    const raw = await page.evaluate(() => { const r = document.querySelector('[role="group"][aria-label="待发送附件"]'); return r ? { sh: r.scrollHeight, ch: r.clientHeight, sw: r.scrollWidth, cw: r.clientWidth } : null; });
    return { value: !!(raw && raw.sh > raw.ch), raw, derivation: 'scrollHeight > clientHeight' };
  });
  await A('附件区滚到底', 'scroll', 'scrollLeft=max', async () => { await page.evaluate(() => { const r = document.querySelector('[role="group"][aria-label="待发送附件"]'); if (r) { r.scrollLeft = r.scrollWidth; r.scrollTop = r.scrollHeight; } }); await sleep(800); });
  const r9b = await R('最后附件可见', 'composer.attachments.last.visible', scope, 'count-30 visibility', async () => {
    const raw = await page.evaluate(() => { const leaf = [...document.querySelectorAll('[role="group"][aria-label="待发送附件"] [class*="_name"]')].find(e => (e.textContent || '').trim() === 'count-30.txt'); if (!leaf) return { found: false }; const r = leaf.getBoundingClientRect(); const rail = document.querySelector('[role="group"][aria-label="待发送附件"]').getBoundingClientRect(); return { found: true, inView: r.left < rail.right && r.right > rail.left }; });
    return { value: !!(raw.found && raw.inView), raw, derivation: 'count-30 within rail viewport' };
  });

  // G7-10 remove single
  await freshTask();
  await A('重新添加三文件', 'setInputFiles', 'a/b/c', () => addFiles([att('attachment-a.txt'), att('attachment-b.txt'), att('attachment-c.md')]));
  const before10 = await names();
  await A('移除attachment-b.txt', 'click', 'remove b', async () => { await page.locator('[role="group"][aria-label="待发送附件"] button[aria-label="移除文件 attachment-b.txt"]').first().click({ timeout: 5000 }); await sleep(900); });
  const r10 = await R('剩余附件名列表', 'composer.attachments.after.remove', scope, 'names', async () => { const n = await names(); return { value: n, raw: { before: before10, after: n } }; });

  // G7-11 clear-all entry
  await freshTask();
  await A('另建三文件草稿', 'setInputFiles', 'a/b/c', () => addFiles([att('attachment-a.txt'), att('attachment-b.txt'), att('attachment-c.md')]));
  const before11 = await names();
  const r11a = await R('附件清空入口', 'composer.attachments.clear.entry', scope, 'clear control', async () => {
    const raw = await page.evaluate(() => { const a = document.querySelector('[data-slot="conversation.input.attachments"]'); const btns = a ? [...a.querySelectorAll('button')] : []; return btns.map(b => b.getAttribute('aria-label') || (b.className || '').toString()); });
    const has = raw.some(x => /清空|全部|清除|移除全部|clear/i.test(x));
    return { value: has, raw: { controls: raw.slice(0, 10), before: before11 }, derivation: 'clear-all control present' };
  });
  let clearedCount = before11.length;
  if (r11a.value) { await A('点击清空入口', 'click', 'clear', async () => { await page.locator('[data-slot="conversation.input.attachments"] button').filter({ hasText: /清空|全部|清除/ }).first().click({ timeout: 4000 }).catch(() => {}); await sleep(1000); }); clearedCount = await itemCount(); }
  const r11b = await R('清空后的草稿附件数', 'composer.attachments.after.clear', scope, 'item count', async () => ({ value: clearedCount, raw: { count: clearedCount, before: before11.length } }));

  // G7-12 send attachment
  await freshTask();
  await A('添加a.txt用于发送', 'setInputFiles', 'a.txt', () => addFiles([att('attachment-a.txt')]));
  await A('发送附件消息', 'fill+click', '只回复附件已收到，不读取其他文件', () => typeAndSend(page, '只回复附件已收到，不读取其他文件'));
  const term12 = await waitTerminal(page, { timeout: 120000 });
  const r12a = await R('已发送气泡附件', 'sent.bubble.attachment', '主任务视图/已发送气泡', 'sent user bubble', async () => { const t = await page.evaluate(() => { const u = [...document.querySelectorAll('[class*="wSkVaW_body"]')].pop(); return u ? u.innerText : ''; }); return { value: t.includes('attachment-a.txt'), raw: { bubbleText: t.slice(0, 200), terminalOk: term12.ok }, derivation: 'sent user bubble text contains attachment-a.txt' }; });
  const r12b = await R('已发送附件删除入口', 'sent.bubble.remove', '主任务视图/已发送气泡', 'remove buttons in user bubble', async () => { const n = await page.evaluate(() => { const u = [...document.querySelectorAll('[class*="wSkVaW_body"]')].pop(); if (!u) return 0; return [...u.querySelectorAll('button')].filter(b => /移除|删除|remove/i.test(b.getAttribute('aria-label') || b.className || '')).length; }); return { value: n, raw: { count: n } }; });

  // G7-13 next-round attachments independent
  await A('第二轮添加b/c', 'setInputFiles', 'b/c', () => addFiles([att('attachment-b.txt'), att('attachment-c.md')]));
  const r13 = await R('第二轮待发送附件列表', 'composer.attachments.round2', scope, 'names', async () => { const n = await names(); return { value: n, raw: { names: n } }; });

  // G7-14 cleanup
  await A('清空剩余草稿附件和文字', 'click', 'clearAll', async () => { await clearAll(); await sleep(500); });
  const r14a = await R('当前草稿附件数', 'composer.attachments.final', scope, 'item count', async () => ({ value: await itemCount(), raw: { count: await itemCount() } }));
  const r14b = await R('当前草稿文字', 'composer.text.final', '主任务视图/composer', SEL.composer, async () => { const t = (await page.locator(SEL.composer).first().innerText()).trim(); return { value: t, raw: { text: t } }; });

  const ended = new Date().toISOString();
  fs.writeFileSync(path.join(root, 'tools', 'run', 'scratch', 'g7-run.json'), JSON.stringify(out, null, 2), 'utf8');
  const ev = evidenceFor(g);
  const mk = (id, object_identity, inputs, steps, assertions, cleanup) => finalizeCase({ case_id: id, object_identity, inputs, actual_steps: steps, assertions, attempt_id: 'G7-A01', environment_id: environmentId, evidence: ev, started_at: t0, ended_at: ended, action_refs: actionRefs, cleanup: cleanup || { status: 'restored', description: '附件草稿清空', read_refs: [] }, notes: 'G7共享附件草稿与已发送任务。' });
  mk('G7-01', '当前草稿附件', ['a/b/c'], ['setInputFiles三文件'], [{ id: 'G7-01-A1', actual: r1.value, read_refs: [r1.event_id] }]);
  mk('G7-02', '当前草稿附件', ['count-01..30'], ['一次添加30'], [{ id: 'G7-02-A1', actual: r2a.value, read_refs: [r2a.event_id] }, { id: 'G7-02-A2', actual: r2b.value, read_refs: [r2b.event_id] }]);
  mk('G7-03', '当前草稿附件', ['01-20,21-35'], ['先20再15'], [{ id: 'G7-03-A1', actual: { before: r3before.value, after: r3after.value }, read_refs: [r3before.event_id, r3after.event_id] }, { id: 'G7-03-A2', actual: r3hint.value, read_refs: [r3hint.event_id] }]);
  mk('G7-04', 'preview.png附件', ['preview.png'], ['添加图片'], [{ id: 'G7-04-A1', actual: r4.value, read_refs: [r4.event_id] }]);
  mk('G7-05', '图片预览', ['preview.png'], ['点击缩略图', '关闭'], [{ id: 'G7-05-A1', actual: r5a.value, read_refs: [r5a.event_id] }, { id: 'G7-05-A2', actual: r5b.value, read_refs: [r5b.event_id] }]);
  mk('G7-06', 'attachment-a.txt卡片', ['a.txt'], ['添加普通文件'], [{ id: 'G7-06-A1', actual: r6a.value, read_refs: [r6a.event_id] }, { id: 'G7-06-A2', actual: r6b.value, read_refs: [r6b.event_id] }]);
  mk('G7-07', '未知格式附件', ['fixture.unknown-fast'], ['添加未知格式'], [{ id: 'G7-07-A1', actual: r7a.value, read_refs: [r7a.event_id] }, { id: 'G7-07-A2', actual: r7b.value, read_refs: [r7b.event_id] }]);
  mk('G7-08', '长文件名附件', [LONG], ['添加并悬停'], [{ id: 'G7-08-A1', actual: r8.value, read_refs: [r8.event_id] }]);
  mk('G7-09', '附件容器', ['count-01..30'], ['滚到底'], [{ id: 'G7-09-A1', actual: r9a.value, read_refs: [r9a.event_id] }, { id: 'G7-09-A2', actual: r9b.value, read_refs: [r9b.event_id] }]);
  mk('G7-10', '三文件草稿', ['移除b'], ['移除单个'], [{ id: 'G7-10-A1', actual: r10.value, read_refs: [r10.event_id] }]);
  mk('G7-11', '三文件草稿', ['清空入口'], ['查找清空入口'], [{ id: 'G7-11-A1', actual: r11a.value, read_refs: [r11a.event_id] }, { id: 'G7-11-A2', actual: r11b.value, read_refs: [r11b.event_id] }]);
  mk('G7-12', '已发送用户气泡', ['a.txt'], ['发送附件消息'], [{ id: 'G7-12-A1', actual: r12a.value, read_refs: [r12a.event_id] }, { id: 'G7-12-A2', actual: r12b.value, read_refs: [r12b.event_id] }]);
  mk('G7-13', '第二轮草稿', ['b/c'], ['发送后添加b/c'], [{ id: 'G7-13-A1', actual: r13.value, read_refs: [r13.event_id] }]);
  mk('G7-14', '当前草稿', [], ['清空附件与文字'], [{ id: 'G7-14-A1', actual: r14a.value, read_refs: [r14a.event_id] }, { id: 'G7-14-A2', actual: r14b.value, read_refs: [r14b.event_id] }]);
  console.log(JSON.stringify({ r1: r1.value, r2: [r2a.value, r2b.value], r3: [r3before.value.length, r3after.value.length, r3hint.value], r4: r4.value, r5: [r5a.value, r5b.value], r6: [r6a.value, r6b.value], r7: [r7a.value, r7b.value], r8: r8.value, r9: [r9a.value, r9b.value], r10: r10.value, r11: [r11a.value, r11b.value], r12: [r12a.value, r12b.value], r13: r13.value, r14: [r14a.value, r14b.value] }, null, 2));
});
