const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = '探索性测试/2026-10-05-需求用例全量探索';
const id = 'DIALOG-049', aid = 'DIALOG-049-A01', oid = 'OBS-260', diffId = 'DIFF-041';
const dir = '证据/DIALOG-049-NIGHT-20261006';
const files = [
  'answer-file-open.png', 'pin-summary-wide-open.png', 'pin-summary-open-file-wide.png',
  'pin-summary-open-file-final.png', 'pin-summary-open-file-state.json', 'summary-panel.json', 'summary-panel.txt'
].map(x => `${dir}/${x}`);
for (const f of files) if (!fs.existsSync(path.join(root, f))) throw new Error(`Missing ${f}`);
const sha = JSON.parse(fs.readFileSync(path.join(root, '用例/来源清单.json'), 'utf8')).source_documents.find(x => x.file === '【桌面端】我的对话.adoc_我的对话-统一补充说明.adoc.md').sha256;
const c = JSON.parse(fs.readFileSync(path.join(root, '用例/cases.json'), 'utf8')).find(x => x.id === id);
const recordPath = path.join(root, `执行记录/${id}.json`), r = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
if (r.attempts.some(x => x.attempt_id === aid)) throw new Error(`${aid} already exists`);
const observed = '在本轮 round-owned DIALOG060-round-owned/index.html 上，从已完成答复下方的“查看 DIALOG060-round-owned/index.html 的改动”入口打开Code差异页，右侧源码可见title/H1/段落和同一项目相对路径。点击“置顶摘要”后，“输出内容”列出index.html、fixture-one.txt、fixture-two.txt；再点置顶摘要的index.html，UI右侧显示D:\\code\\tpt-workspace\\DIALOG060-round-owned\\index.html及HTML类型，但内部frame URL为chrome-error://chromewebdata/且内容为空。因此路径/名称相同，置顶摘要入口没有显示与答复Code视图相同的文件内容。';
const evidence = files.map(p => ({ path: p, case_id: id, attempt_id: aid, observation_id: oid, captured_at: '2026-10-06T00:30:01.164Z', type: p.endsWith('.png') ? 'screenshot' : 'UI DOM state', proves: `${aid}: ${observed}`, redacted: true, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex') }));
const checkpoints = [
  { expected_index: 1, expected: c.expected[0], observed: '答复产物卡的UI按钮打开DIALOG060-round-owned/index.html并在Code差异视图显示对应源码；置顶摘要的同名index.html入口进入HTML侧栏，但该侧栏frame为chrome-error://chromewebdata/且页面内容为空。仅路径一致，内容未在第二入口重开。', verdict: '存在差异', evidence: [files[0], files[1], files[2], files[3], files[4]] },
  { expected_index: 2, expected: c.expected[1], observed: '答复侧入口、置顶摘要列表、HTML侧栏都显示index.html；打开后栏头也显示完整round-owned路径及类型HTML。名称和文件类型信息相符，但两个查看器表现不同。', verdict: '符合', evidence: [files[0], files[1], files[2], files[3], files[4]] }
];
const attempt = {
  attempt_id: aid, started_at: '2026-10-06T00:23:20.000Z', ended_at: '2026-10-06T00:30:01.164Z', environment_id: 'ENV-001',
  surface: '已完成round-owned DIALOG060会话中的产物更改卡、置顶摘要与右侧HTML查看器；CDP 9234 + Playwright',
  actual_preconditions: { account_alias: 'Arthur', workspace: 'tpt-workspace', project: '既有项目；本轮仅访问DIALOG060-round-owned/', session_id: 'round-owned文件生成任务In the currently selected existing', model: '标准 / low（来源任务）；本attempt只做UI回读，无新模型请求', permission: '来源任务为工作区内修改；当前只浏览本轮刚创建文件，未改动内容', fixtures: ['DIALOG060-round-owned/index.html；此前DIALOG060-A01在UI内创建的本轮夹具'] },
  input: '从已完成答复的本轮产物入口和置顶摘要分别打开同一 index.html，对比路径、名称、类型与可见内容。',
  actual_steps: ['通过产品任务搜索UI查询DIALOG060并选择本轮“ In the currently selected existing ”文件创建会话。','在答复下方点击“查看 DIALOG060-round-owned/index.html 的改动”；Code视图右侧显示同一文件完整静态源码。','点击会话的“置顶摘要”；界面“输出内容”列出 index.html、fixture-one.txt、fixture-two.txt。','点击置顶摘要中的index.html；右侧标题显示项目相对路径DIALOG060-round-owned/index.html，文件类型HTML；重新枚举页面frame确认frame URL为chrome-error://chromewebdata/，正文为空。'],
  wait_condition: '每次切换阅读面板后重新读UI状态；源代码打开后等待frame完成，再读取URL与正文。',
  checkpoints, observed_result: observed, status: '已执行-存在差异', evidence: files, difference_ids: [diffId], notes: '只读回本轮现有文件。DIALOG060-A01先前也记录HTML预览空白；本次通过pin summary再次观察到同一路径在Code与HTML两种入口表现不同。待双方审核，不直接断定故障原因。'
};
r.attempts.push(attempt); r.latest_attempt_id = aid; r.source_sha256 = sha; r.status = '已执行-存在差异'; r.review_status = '待双方审核'; r.blocker = null;
r.differences = [...(r.differences || []), diffId];
r.product_observations = r.product_observations || [];
r.product_observations.push({ observation_id: oid, feature_id: null, statement: observed, case_ids: [id], attempt_ids: [aid], environment_id: 'ENV-001', verified_depth: '同一个round-owned静态HTML通过答复更改卡与置顶摘要两条入口打开；源代码回读与HTML侧栏frame状态独立记录。', scope_and_limits: '只限DIALOG060-round-owned/index.html；HTML预览空白不代表源文件内容丢失，Code视图源码可见；待双方审核。', evidence: files, review_status: '待双方审核' });
r.audit_history = r.audit_history || []; r.audit_history.push({ at: attempt.ended_at, event: `${aid} 使用答复产物卡及置顶摘要分别打开round-owned同一文件；HTML侧栏出现空chrome-error frame，追加DIFF-041，旧阻塞历史保留。` });
fs.writeFileSync(recordPath, JSON.stringify(r, null, 2) + '\n', 'utf8');
const idx = path.join(root, '证据/索引.jsonl'), rows = fs.readFileSync(idx, 'utf8').trimEnd().split(/\r?\n/).filter(Boolean).map(JSON.parse); rows.push(...evidence); fs.writeFileSync(idx, rows.map(x => JSON.stringify(x)).join('\n') + '\n', 'utf8');
const obsPath = path.join(root, '观察记录.jsonl'), observations = fs.readFileSync(obsPath, 'utf8').trimEnd().split(/\r?\n/).filter(Boolean).map(JSON.parse); observations.push({ observation_id: oid, recorded_at: attempt.ended_at, related_cases: [id], category: 'same artifact open from answer and pinned summary', scope: 'DIALOG-049-A01; same round-owned DIALOG060-round-owned/index.html', observation: observed, candidate_status: 'pending bilateral review; no formal product conclusion', evidence }); fs.writeFileSync(obsPath, observations.map(x => JSON.stringify(x)).join('\n') + '\n', 'utf8');
fs.appendFileSync(path.join(root, '差异与问题登记.md'), `\n\n## ${diffId} — 置顶摘要中的HTML文件条目打开空白侧栏\n\n- 关联用例：DIALOG-049；尝试：${aid}；观察：${oid}。\n- 实际行为：答复产物卡的“查看 DIALOG060-round-owned/index.html 的改动”打开同路径Code差异视图并显示源码。置顶摘要“输出内容”列出index.html；点击后UI显示同一路径及HTML类型，但frame URL为chrome-error://chromewebdata/，内容为空。\n- 结论边界：本轮已创建源文件仍可在Code视图读取；空白只观察于置顶摘要的HTML查看器入口，不推断源文件丢失或其它文件类型都受影响。DIALOG-060-A01也有直接HTML预览空白观察；待双方审核原因、产品承诺及是否构成问题。\n- 证据：${files.join('、')}。\n- 审核状态：待双方审核。\n`, 'utf8');
console.log(JSON.stringify({ attempt: aid, observation: oid, difference: diffId, evidence: evidence.length, hashes: evidence.map(x => x.sha256) }));
