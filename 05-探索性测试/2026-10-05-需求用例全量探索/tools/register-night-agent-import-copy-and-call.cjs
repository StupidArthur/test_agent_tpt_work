const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const caseRoot = '探索性测试/2026-10-05-需求用例全量探索';
const evidenceDir = '证据/AGENT-CREATE-20261006';
const evidenceFiles = [
  'expert-manager-before-import.png', 'folder-selected.png', 'import-result.png', 'name-conflict.png',
  'import-after-success.png', 'expert-cards-before.json', 'call-before-send.png', 'call-result.png',
  'call-result.txt', 'call-result.json', 'call-trace.png', 'call-trace.txt'
].map(n => `${evidenceDir}/${n}`);
for (const p of evidenceFiles) if (!fs.existsSync(path.join(caseRoot, p))) throw new Error(`Missing evidence: ${p}`);

const manifest = JSON.parse(fs.readFileSync(path.join(caseRoot, '用例/来源清单.json'), 'utf8'));
const sourceFile = '待评审【桌面端】Agent管理需求设计.adoc_TPT桌面端Agent页面需求设计_V1.4.adoc.md';
const sourceSha = manifest.source_documents.find(x => x.file === sourceFile)?.sha256;
if (!sourceSha) throw new Error('Source hash missing');
const importedAt = '2026-10-06T00:05:11.000Z';
const callAt = '2026-10-06T00:10:18.468Z';
const newAttempts = [];

function evidenceRows(caseId, attemptId, observationId, files, time, claim) {
  return files.map(p => ({
    path: p, case_id: caseId, attempt_id: attemptId, observation_id: observationId,
    captured_at: time, type: p.endsWith('.png') ? 'screenshot' : 'UI DOM/Trace capture',
    proves: `${attemptId}: ${claim}`, redacted: true,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(caseRoot, p))).digest('hex')
  }));
}

function appendAttempt(caseId, definition, record, attempt, observation, rows) {
  if (record.attempts.some(a => a.attempt_id === attempt.attempt_id)) throw new Error(`Attempt already exists: ${attempt.attempt_id}`);
  attempt.source_sha256 = sourceSha;
  attempt.status = record.status;
  attempt.evidence = rows.map(x => x.path);
  record.attempts.push(attempt);
  record.latest_attempt_id = attempt.attempt_id;
  record.review_status = '待双方审核';
  record.blocker = null;
  record.audit_history = record.audit_history || [];
  record.audit_history.push({ at: attempt.ended_at, event: `${attempt.attempt_id} 夜间续跑实际UI操作补测；保留既有attempt与证据，结论待双方审核。` });
  record.product_observations = record.product_observations || [];
  record.product_observations.push({
    observation_id: observation.observation_id, feature_id: null,
    statement: observation.observation, case_ids: [caseId], attempt_ids: [attempt.attempt_id],
    environment_id: 'ENV-001', verified_depth: observation.verified_depth,
    scope_and_limits: observation.scope_and_limits, evidence: rows.map(x => x.path), review_status: '待双方审核'
  });
  fs.writeFileSync(path.join(caseRoot, `执行记录/${caseId}.json`), JSON.stringify(record, null, 2) + '\n', 'utf8');
  newAttempts.push({ attempt, observation, rows });
}

const cases = JSON.parse(fs.readFileSync(path.join(caseRoot, '用例/cases.json'), 'utf8'));
const extras = JSON.parse(fs.readFileSync(path.join(caseRoot, '用例/extra-cases.json'), 'utf8'));

// Folder import followed the supported in-page UI. The original same-name object was never overwritten.
{
  const id = 'AGENT-005', attemptId = 'AGENT-005-A02', observationId = 'OBS-258';
  const definition = cases.find(x => x.id === id);
  const record = JSON.parse(fs.readFileSync(path.join(caseRoot, `执行记录/${id}.json`), 'utf8'));
  const files = evidenceFiles.slice(0, 6);
  const claim = '专家管理页的导入入口与新建入口分离；目录input选中round-owned文件夹后显示FOLDER、文件夹名及2个文件；提交发现同名冲突时保留原项并选择“作为副本”；其后独立UI回读“我的专家”从10增至11，11张卡均显示“来源 我创建的 · 本地运行”。由于标题重名，不能仅凭卡片文本区分副本内部ID。';
  const rows = evidenceRows(id, attemptId, observationId, files, importedAt, claim);
  const attempt = {
    attempt_id: attemptId, started_at: importedAt, ended_at: '2026-10-06T00:06:15.731Z', environment_id: 'ENV-001',
    surface: 'TPT Work 专家管理iframe → 导入本地专家对话框 → webkitdirectory folder input；CDP 9234 + Playwright',
    actual_preconditions: { account_alias: 'Arthur', workspace: 'tpt-workspace', project: '未新增项目', model: '未发送模型请求', permission: '仅使用专家管理UI导入', fixtures: ['本轮目录包 night-agent-complete-20261006；同名round-owned对象已存在'] },
    input: '通过页面目录选择控件导入夹具/night-agent-complete-20261006；重名时选择作为副本，绝不覆盖。',
    actual_steps: ['专家管理页可见“导入专家”和“新建专家”两个独立入口。','打开“导入本地专家”UI弹窗，以目录input上传本轮文件夹；界面显示FOLDER、night-agent-complete-20261006、2个文件·1.5KB。','点击提交后，产品提示该内部名称已存在，显示“覆盖现有”和“作为副本”两个选项。','明确选择“作为副本”；未触碰“覆盖现有”。随后独立回读我的专家数10→11，卡片列表增加同名本轮样本。'],
    wait_condition: '等待导入弹窗处理完成，再重新读取管理页卡片总数与来源标签。',
    checkpoints: [
      { expected_index: 1, expected: definition.expected[0], observed: '入口观察：专家管理页在同一页面提供独立“导入专家”按钮和“新建专家”按钮；后者为expert-manager引导创建会话。当前导入对话框与新建入口分离。', verdict: '符合', evidence: [files[0], files[1]] },
      { expected_index: 2, expected: definition.expected[1], observed: '目录选择UI将夹具呈现为FOLDER，列出内部包名及2个文件；重名时可选择“作为副本”。选择后UI卡片数10→11。此次副本的卡片标题与现有样本相同，内部区分边界只在后续composer引用中观察到，无法从列表单独确定身份。', verdict: '符合', evidence: [files[1], files[2], files[3], files[4], files[5]] }
    ],
    observed_result: claim, status: record.status, difference_ids: [], notes: '用户授权本轮round-owned包UI导入。导入的同名对象选择副本，不覆盖。新副本仍留在产品内供审核；因卡片标题相同且删除可能误触既有对象，本轮不删除。'
  };
  const observation = { observation_id: observationId, observation: claim, verified_depth: '只验证本轮专家文件夹导入、重名副本分支、卡片数量及可见来源标签；未据此断言市场来源。', scope_and_limits: '同名副本不能从卡片列表独立识别；未覆盖或删除任何既有对象；样本留存待审核。' };
  appendAttempt(id, definition, record, attempt, observation, rows);
  record.cleanup = record.cleanup || { changes: [], remaining: [] };
  record.cleanup.changes = [...(record.cleanup.changes || []), { change: '同名round-owned专家包通过UI“作为副本”再导入一次', restored: false, verification: '我的专家卡片数由10增至11；没有覆盖旧条目。' }];
  record.cleanup.remaining = [...new Set([...(record.cleanup.remaining || []), 'UI副本形成同名round-owned专家卡片；无法安全区分对应删除控件，故保留并记录为本轮资产。'])];
  fs.writeFileSync(path.join(caseRoot, `执行记录/${id}.json`), JSON.stringify(record, null, 2) + '\n', 'utf8');
}

// Actual use of the round-owned imported Expert copy: chip selection, exact unique result and Trace content.
{
  const id = 'EXTRA-006', attemptId = 'EXTRA-006-A02', observationId = 'OBS-259';
  const definition = extras.find(x => x.id === id);
  const record = JSON.parse(fs.readFileSync(path.join(caseRoot, `执行记录/${id}.json`), 'utf8'));
  const files = evidenceFiles.slice(6);
  const claim = '从专家卡片“使用”进入新任务后，composer出现不可编辑引用chip agent-night-agent-complete-20261006。追加明确标记请求并发送后，标准/low两轮任务约6.8秒返回精确NIGHT_AGENT_IMPORT_OK_20261006。Trace显示同名skill_content载入包内Capability/限制与最终输出；本轮助手内容未见工具调用。';
  const rows = evidenceRows(id, attemptId, observationId, files, callAt, claim);
  const attempt = {
    attempt_id: attemptId, started_at: '2026-10-06T00:08:34.764Z', ended_at: callAt, environment_id: 'ENV-001',
    surface: '专家管理卡片“使用”→ round-owned引用chip → 标准/low对话 → Trace；CDP 9234 + Playwright',
    actual_preconditions: { account_alias: 'Arthur', workspace: 'tpt-workspace', project: '未新增项目', session_id: '本轮专家选择新任务', model: '标准 / low', permission: '工作区内修改，但输入仅请求固定文本，无任何副作用任务', fixtures: ['round-owned目录包night-agent-complete-20261006；重名副本入口由UI创建'] },
    input: '请按当前选中的本轮夜间导入专家固定规则，原样返回该专家的唯一标记。仅返回标记，不要调用工具或执行任何操作。',
    actual_steps: ['从专家管理卡片点击“使用”；新任务composer内出现不可编辑引用chip，title为agent-night-agent-complete-20261006。','保留该chip，追加仅请求本轮样本固定标记且禁止调用工具的提示，截图后通过UI发送。','等待稳定终态；答案为NIGHT_AGENT_IMPORT_OK_20261006，耗时约6.8秒。','切换“轨迹”，核对同一技术名skill_content资源及固定指令/最终输出；本轮Trace没有显示工具调用。'],
    wait_condition: '等待完整两轮消息稳定完成并看到唯一标记；之后打开Trace检查目标资源。',
    checkpoints: [
      { expected_index: 1, expected: definition.expected[0], observed: '卡片“使用”确实将agent-night-agent-complete-20261006作为不可编辑引用chip带入新任务；Trace中出现<skill_content name="agent-night-agent-complete-20261006">与对应<skill_instructions>，不是只在普通prompt中提及名称。', verdict: '符合', evidence: [files[0], files[4]] },
      { expected_index: 2, expected: definition.expected[1], observed: 'Trace最后一轮最终输出精确NIGHT_AGENT_IMPORT_OK_20261006，符合round-owned agent.md标记；本轮输入明确要求不调用工具，Trace没有本任务的工具调用节点。', verdict: '符合', evidence: [files[1], files[2], files[3], files[4], files[5]] }
    ],
    observed_result: claim, status: record.status, evidence: rows.map(x => x.path), difference_ids: [], notes: 'UI任务仅请求固定标记；没有文件、网络、连接器、设备或用户数据操作。用户授权round-owned专家样本留存；待双方审核。'
  };
  const observation = { observation_id: observationId, observation: claim, verified_depth: '一个本轮包；一次UI引用调用；完整Trace里标记与包资源同名。', scope_and_limits: '仅证明该round-owned包与标准/low当前会话的这次调用；本轮只读指令，不代表所有Expert执行能力。' };
  appendAttempt(id, definition, record, attempt, observation, rows);
}

// Append evidence and observations without replacing historical entries.
const indexPath = path.join(caseRoot, '证据/索引.jsonl');
const indexRows = fs.readFileSync(indexPath, 'utf8').trimEnd().split(/\r?\n/).filter(Boolean).map(JSON.parse);
for (const item of newAttempts) indexRows.push(...item.rows);
fs.writeFileSync(indexPath, indexRows.map(x => JSON.stringify(x)).join('\n') + '\n', 'utf8');
const obsPath = path.join(caseRoot, '观察记录.jsonl');
const observations = fs.readFileSync(obsPath, 'utf8').trimEnd().split(/\r?\n/).filter(Boolean).map(JSON.parse);
for (const item of newAttempts) observations.push({ observation_id: item.observation.observation_id, recorded_at: item.attempt.ended_at, related_cases: [item.attempt.attempt_id.split('-A')[0]], category: item.attempt.attempt_id.startsWith('AGENT-005') ? 'round-owned Expert folder import duplicate branch' : 'round-owned Expert invocation and Trace', scope: item.observation.scope_and_limits, observation: item.observation.observation, candidate_status: 'pending bilateral review; no formal product conclusion', evidence: item.rows });
fs.writeFileSync(obsPath, observations.map(x => JSON.stringify(x)).join('\n') + '\n', 'utf8');

const changes = path.join(caseRoot, '变更清单.md');
fs.appendFileSync(changes, '\n| CL-29 | 2026-10-06T00:05Z | 同名round-owned夜间专家包通过“作为副本”导入，UI本地专家数10→11；没有覆盖旧项 | 同名副本无法安全区分删除目标，保留待审；无既有样本被覆盖 | AGENT-005-A02；证据/AGENT-CREATE-20261006/ |\n', 'utf8');
console.log(JSON.stringify({ attempts: newAttempts.map(x => x.attempt.attempt_id), indexedEvidence: newAttempts.reduce((n, x) => n + x.rows.length, 0), observations: newAttempts.map(x => x.observation.observation_id) }));
