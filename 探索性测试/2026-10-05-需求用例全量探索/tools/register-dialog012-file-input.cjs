const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = '探索性测试/2026-10-05-需求用例全量探索';
const id = 'DIALOG-012', aid = 'DIALOG-012-A01', oid = 'OBS-261';
const dir = '证据/DIALOG-012-NIGHT-20261006';
const actionText = `2026-10-06T00:37:00Z 本轮UI输入操作记录\n\n- 现有round-owned夹具：DIALOG060-round-owned/fixture-one.txt（先前由DIALOG060-A01通过产品UI创建并读回；本次只选取，不改写）。\n- 新建任务 composer 显示 tpt-workspace 项目，标准/low，访问模式仅可查看。点击 composer 的“添加文件或调用指令”可见菜单项“添加本地文件”；DOM检查到此可见composer下的真实HTML input[type=file][multiple]（input本身hidden，父级为当前可见composer的tools区域）；另一个同名input所在composer rect为0x0。本次对与当前可见composer关联的input执行 setInputFiles('D:/code/tpt-workspace/DIALOG060-round-owned/fixture-one.txt')。\n- UI随后显示round-owned文件卡 fixture-one.txt / TXT 21B，并有“移除文件 fixture-one.txt”按钮。选择后input.files被应用重置为空数组；文件卡仍在UI。\n- 用户任务仅请求元数据固定标记，不读取文件，不调用工具。Trace用户节点显示“文件 ×1”及提示文本；助手用时7秒回复DIALOG012_METADATA_ONLY_OK；未见本轮工具调用节点。Trace不展示原始请求载荷，因此无法从当前可见证据判断底层附件是否携带文件正文。\n- 截图及Trace只保存界面可见的round-owned文件名、大小和固定标记；未捕获原始网络请求/请求正文。\n`;
fs.writeFileSync(path.join(root, `${dir}/input-selection-action.txt`), actionText, 'utf8');
const files = [
  'new-task.png', 'project-readonly.png', 'file-menu-wide.png', 'prompt-before-send.png', 'result-final.png',
  'result-final.txt', 'trace-final.png', 'trace-final.txt', 'input-selection-action.txt'
].map(x => `${dir}/${x}`);
const resultText = `UI请求：在 tpt-workspace 通过标准/low、仅可查看模式选取本轮 fixture-one.txt；请求不读取文件也不调用工具。\n\n答复：DIALOG012_METADATA_ONLY_OK\n\nTrace用户节点：文件 ×1 · This is DIALOG-012 read-only attachment-path probe...\nTrace助手节点：DIALOG012_METADATA_ONLY_OK\n\n可见文件卡：fixture-one.txt / TXT 21B。未观察到本轮工具调用。原始传输载荷不可见；不能据Trace当前表面证明无正文上传。\n`;
fs.writeFileSync(path.join(root, `${dir}/result-final.txt`), resultText, 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, '用例/来源清单.json'), 'utf8'));
const sourceSha = manifest.source_documents.find(x => x.file === '【桌面端】我的对话.adoc_我的对话-统一补充说明.adoc.md').sha256;
const cases = JSON.parse(fs.readFileSync(path.join(root, '用例/cases.json'), 'utf8'));
const definition = cases.find(x => x.id === id);
const recordPath = path.join(root, `执行记录/${id}.json`), record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
if (record.attempts.some(x => x.attempt_id === aid)) throw new Error(`${aid} already exists`);
const observed = '在新建tpt-workspace任务中，使用当前可见composer关联的真实HTML input[type=file]选择round-owned DIALOG060-round-owned/fixture-one.txt。UI显示文件卡“fixture-one.txt / TXT 21B”，并提供移除入口；Trace用户节点显示“文件 ×1”，无本轮工具调用，助手返回DIALOG012_METADATA_ONLY_OK。该结果证明当前UI能够添加此无害本地文件，但Trace没有提供原始请求体，无法判断是否仅传路径引用或携带了文件正文。';
const proofFiles = files.filter(x => !x.endsWith('.txt') || x.endsWith('result-final.txt') || x.endsWith('trace-final.txt') || x.endsWith('input-selection-action.txt'));
for (const p of proofFiles) if (!fs.existsSync(path.join(root, p))) throw new Error(`Missing ${p}`);
const evidence = proofFiles.map(p => ({ path: p, case_id: id, attempt_id: aid, observation_id: oid, captured_at: '2026-10-06T00:38:48.033Z', type: p.endsWith('.png') ? 'screenshot' : 'UI Trace/operation record', proves: `${aid}: ${observed}`, redacted: true, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex') }));
const attempt = {
  attempt_id: aid, started_at: '2026-10-06T00:33:00.000Z', ended_at: '2026-10-06T00:38:48.033Z', environment_id: 'ENV-001',
  surface: '新建任务composer → 添加文件菜单 → 当前可见HTML file input → 标准/low 仅可查看任务与Trace；CDP 9234 + Playwright',
  actual_preconditions: { account_alias: 'Arthur', workspace: 'tpt-workspace', project: '既有项目；无新建项目', session_id: 'Attachment metadata probe reply.（本轮新建任务）', model: '标准 / low', permission: '仅可查看', fixtures: ['DIALOG060-round-owned/fixture-one.txt；DIALOG060-A01授权创建的本轮唯一标记夹具'] },
  input: 'This is DIALOG-012 read-only attachment-path probe. Do not open or read the attached file, and do not call tools. Based only on the UI attachment metadata, reply exactly DIALOG012_METADATA_ONLY_OK. Do not infer or reveal any file body. No external actions.',
  actual_steps: ['通过产品UI点击“新建任务”，用可见项目选择器选择已有tpt-workspace；访问模式切到仅可查看。','点击当前可见composer的“添加文件或调用指令”；读取UI菜单项“添加本地文件”以及两个input[type=file]候选。','按已观察的DOM父级尺寸选择与当前可见composer对应的真实HTML input，仅对该round-owned fixture执行setInputFiles；未点开操作系统原生文件对话框。','界面出现fixture-one.txt / TXT 21B文件卡和移除控件；用户消息只请求元数据标记且明确禁止读取/调用工具。','等待稳定终态：助手回复DIALOG012_METADATA_ONLY_OK，用时约7秒；回看Trace用户节点文件×1、助手节点，未见本轮工具调用。'],
  wait_condition: '等待产品任务结束并出现稳定答案，再切换Trace回读用户消息与助手消息；不依据请求文本中的marker提前判定答案。',
  checkpoints: [
    { expected_index: 1, expected: definition.expected[0], observed: '真实HTML file input通过当前UI添加本地夹具；附件卡显示文件名与TXT/21B。本次UI卡没有显示绝对本地路径，Trace仅标为“文件 ×1”，故路径引用语义尚未验证。', verdict: '未验证', evidence: [proofFiles[2], proofFiles[3], proofFiles[4], proofFiles[7], proofFiles[8]] },
    { expected_index: 2, expected: definition.expected[1], observed: '当前Trace用户节点不显示文件正文，且没有本轮工具调用/文件读取步骤；助手返回唯一标记。但原始请求载荷不可见，仅凭Trace表面不能确认附件未携带正文，故“不上传文件正文”检查点未验证。', verdict: '未验证', evidence: [proofFiles[4], proofFiles[5], proofFiles[6], proofFiles[7], proofFiles[8]] }
  ],
  observed_result: observed, status: '已执行-结论不确定', evidence: evidence.map(x => x.path), difference_ids: [], notes: '没有使用原生文件选择器或数据资产；只选取用户授权的round-owned文本夹具。UI输入后原生file input.files清空，但附件卡保留。当前无传输层请求体证据，不能把UI文件卡或未调用工具等同于未上传文件正文。新会话及其一条附件消息保留供双方审核。'
};
record.attempts.push(attempt); record.latest_attempt_id = aid; record.source_sha256 = sourceSha; record.status = '已执行-结论不确定'; record.review_status = '待双方审核'; record.blocker = null;
record.product_observations = record.product_observations || [];
record.product_observations.push({ observation_id: oid, feature_id: null, statement: observed, case_ids: [id], attempt_ids: [aid], environment_id: 'ENV-001', verified_depth: '一次产品UI真实HTML file input选择；新建标准/low只读会话仅作无工具元数据标记回复。', scope_and_limits: '仅round-owned 21B文本夹具；Trace不暴露请求正文；不判定底层传输形式。', evidence: evidence.map(x => x.path), review_status: '待双方审核' });
record.cleanup = record.cleanup || { changes: [], remaining: [] };
record.cleanup.remaining = [...new Set([...(record.cleanup.remaining || []), '本轮新建的Attachment metadata probe reply会话含fixture-one.txt一条附件消息；内容仅为DIALOG060 round-owned唯一标记文件，因不可删除消息而保留供审核。'])];
record.audit_history = record.audit_history || []; record.audit_history.push({ at: attempt.ended_at, event: '用户授权本轮夹具后，DIALOG-012-A01真实使用UI file input附件路径；只验证UI卡与Trace可见面，传输正文范围未验证。' });
fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n', 'utf8');
const idxPath = path.join(root, '证据/索引.jsonl'), idx = fs.readFileSync(idxPath, 'utf8').trimEnd().split(/\r?\n/).filter(Boolean).map(JSON.parse); idx.push(...evidence); fs.writeFileSync(idxPath, idx.map(x => JSON.stringify(x)).join('\n') + '\n', 'utf8');
const obsPath = path.join(root, '观察记录.jsonl'), obs = fs.readFileSync(obsPath, 'utf8').trimEnd().split(/\r?\n/).filter(Boolean).map(JSON.parse); obs.push({ observation_id: oid, recorded_at: attempt.ended_at, related_cases: [id], category: 'round-owned local file UI attachment and request visibility', scope: `${aid}; fixture DIALOG060-round-owned/fixture-one.txt only`, observation: observed, candidate_status: 'pending bilateral review; no formal product conclusion', evidence }); fs.writeFileSync(obsPath, obs.map(x => JSON.stringify(x)).join('\n') + '\n', 'utf8');
fs.appendFileSync(path.join(root, '变更清单.md'), '\n| CL-30 | 2026-10-06T00:33Z | 新建Attachment metadata probe reply测试会话并通过产品HTML file input附加round-owned fixture-one.txt | 会话与单个附件消息保留待审；源文件不变；权限仅可查看 | DIALOG-012-A01；证据/DIALOG-012-NIGHT-20261006/ |\n', 'utf8');
console.log(JSON.stringify({ attempt: aid, observation: oid, evidence: evidence.length, hashes: evidence.map(x => x.sha256) }));
