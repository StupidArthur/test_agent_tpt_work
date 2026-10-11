const fs = require('fs');
const crypto = require('crypto');
const base = '探索性测试/2026-10-05-需求用例全量探索';
const source = base + '/证据/SKILL-DISABLED-PROBE-20261006';
const target = base + '/证据/SKILL-017/SKILL-017-A02';
const names = ['disabled-card.png','prompt-before-send.png','conversation-result.png','trace-confirmed.png','available-skills-extract.txt','restore.json','restored-card.png'];
for (const name of names) {
  if (!fs.existsSync(source + '/' + name)) throw new Error('Missing evidence: ' + name);
}
fs.mkdirSync(target, {recursive:true});
for (const name of names) fs.copyFileSync(source + '/' + name, target + '/' + name);
const evidence = names.map(name => '证据/SKILL-017/SKILL-017-A02/' + name);
const recordPath = base + '/执行记录/SKILL-017.json';
const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
if (record.attempts.some(item => item.attempt_id === 'SKILL-017-A02')) throw new Error('Attempt already registered');
const observed = {
  captured_at: '2026-10-06T07:33:00+08:00',
  skill: 'round-import-probe-20261005',
  initial_aria_checked: 'true',
  disabled_aria_checked: 'false',
  restored_aria_checked: 'true',
  task_prompt: 'Please explicitly use the Skill named round-import-probe-20261005 for trigger ROUND_IMPORT_PROBE_20261005. If that Skill is unavailable, reply exactly SKILL_DISABLED_NOT_AVAILABLE. Do not infer or invent any tool result.',
  answer: 'SKILL_DISABLED_NOT_AVAILABLE',
  task_elapsed_visible: '7秒',
  model: '标准 / low',
  trace: {
    available_skills_context_captured: true,
    target_skill_in_available_skills: false,
    trace_summary_visible: '1轮 1步',
    skill_tool_call_visible: false,
    assistant_output: 'SKILL_DISABLED_NOT_AVAILABLE'
  },
  restoration: 'The exact round-owned Skill switch was re-read as checked=true after the task. No other Skill was toggled.'
};
fs.writeFileSync(target + '/observed.json', JSON.stringify(observed, null, 2) + '\n', 'utf8');
evidence.push('证据/SKILL-017/SKILL-017-A02/observed.json');
const attempt = {
  attempt_id:'SKILL-017-A02',
  started_at:'2026-10-06T07:31:40+08:00',
  ended_at:'2026-10-06T07:34:00+08:00',
  environment_id:'ENV-001',
  surface:'Skills manager iframe and standard/low task conversation + Trace UI; Electron CDP 9234 with Playwright',
  actual_preconditions:{account_alias:'Arthur',workspace:'tpt-workspace',project:'existing project; no project added',session_id:'new current-round task created through visible New Task UI',model:'标准 / low',permission:'仅可查看',fixture:'round-import-probe-20261005; imported, round-owned, initially enabled'},
  input:observed.task_prompt,
  actual_steps:[
    'In the Skills UI, read the exact round-owned Skill card switch as aria-checked=true.',
    'Clicked only that card switch. Re-read aria-checked=false and captured the disabled state.',
    'Opened a new task through the visible New Task button; verified the composer displayed standard / low and 仅可查看. Did not select the Skill chip.',
    'Sent the prompt naming the disabled Skill and asking the product to report unavailable rather than invent tool output.',
    'Waited until the selected task reached 已完成工作. It displayed SKILL_DISABLED_NOT_AVAILABLE after 7 seconds.',
    'Opened Trace. The captured available-skills context omitted round-import-probe-20261005; the trace showed 1 round / 1 step and no Skill tool call row.',
    'Returned to Skills UI, re-read the exact round-owned Skill switch, and restored aria-checked=true; independently captured restored state.'
  ],
  wait_condition:'Waited for the exact current task to reach a terminal state, then inspected that selected task in Trace; did not use prior transcript markers as completion signals.',
  checkpoints:[
    {expected_index:1,expected:'不参与自动发现与自动调用',observed:'With only the exact round-owned Skill disabled, it was absent from the captured available_skills list in the new task runtime context. The task did not invoke the Skill tool and returned the requested unavailable marker.',verdict:'符合',evidence:['证据/SKILL-017/SKILL-017-A02/disabled-card.png','证据/SKILL-017/SKILL-017-A02/available-skills-extract.txt','证据/SKILL-017/SKILL-017-A02/trace-confirmed.png','证据/SKILL-017/SKILL-017-A02/conversation-result.png']},
    {expected_index:2,expected:'不能仅凭回答猜调用',observed:'The answer was verified against the selected task Trace: no Skill tool invocation was present, and the runtime available-skills catalog excluded the target Skill. The conclusion is based on Trace/context, not the answer alone.',verdict:'符合',evidence:['证据/SKILL-017/SKILL-017-A02/trace-confirmed.png','证据/SKILL-017/SKILL-017-A02/available-skills-extract.txt','证据/SKILL-017/SKILL-017-A02/observed.json']}
  ],
  observed_result:'The round-owned Skill was initially enabled, was disabled through its UI switch, and did not appear in the next task runtime available_skills context or receive a tool invocation even when explicitly named. The UI returned the requested unavailable marker. The Skill was restored to enabled and re-read as checked.',
  status:'已执行-符合预期',
  evidence,
  difference_ids:[],
  notes:'Only the newly imported round-owned Skill was toggled, and its prior enabled state was restored. The task used read-only permission. No files, connectors, external services, user assets, or existing user tasks were modified. Pending bilateral review.'
};
record.attempts.push(attempt);
record.latest_attempt_id = attempt.attempt_id;
record.status = attempt.status;
record.review_status = '待双方审核';
delete record.blocker;
record.product_observations ||= [];
record.product_observations.push({feature_id:null,statement:'停用一个本轮Skill后，它未出现在新任务Trace的 available_skills 目录中；对该Skill名称的明确请求返回了不可用标记，未观察到Skill工具调用。此后通过UI恢复该本轮Skill为启用。',case_ids:['SKILL-017'],attempt_ids:['SKILL-017-A02'],environment_id:'ENV-001',verified_depth:'真实UI停用、独立新任务、运行上下文可用Skill目录、Trace调用核对、UI恢复回读',scope_and_limits:'仅round-import-probe-20261005本轮样本，单次新建只读任务，标准/low；不外推至全部Skill类型或其他工作区。',evidence,relation_to_design:'待双方审核；按Trace与runtime context验证，而非根据答案推断',review_status:'待双方审核'});
fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n', 'utf8');
const indexPath = base + '/证据/索引.jsonl';
const captured = '2026-10-06T07:34:00+08:00';
const proves = {
  'disabled-card.png':'round-owned目标Skill关闭后的aria-checked=false UI状态',
  'prompt-before-send.png':'新建任务中的实际输入与只读权限、standard/low模式',
  'conversation-result.png':'目标任务等待7秒后显示完成与SKILL_DISABLED_NOT_AVAILABLE',
  'trace-confirmed.png':'所选任务Trace为1轮1步，未出现Skill工具调用',
  'available-skills-extract.txt':'新任务运行上下文的available_skills完整片段；不含目标Skill名称',
  'restore.json':'测试后目标Skill开关回读与恢复结果',
  'restored-card.png':'目标round-owned Skill恢复启用的UI状态',
  'observed.json':'本attempt实际操作、终态、Trace范围与恢复读回结构化摘录'
};
for (const name of [...names,'observed.json']) {
  const full = target + '/' + name;
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
  fs.appendFileSync(indexPath, JSON.stringify({path:'证据/SKILL-017/SKILL-017-A02/'+name,case_id:'SKILL-017',attempt_id:'SKILL-017-A02',captured_at:captured,type:name.endsWith('.png')?'截图':'DOM',proves:proves[name],redacted:true,sha256}) + '\n', 'utf8');
}
console.log(JSON.stringify({attempt:attempt.attempt_id,evidence:evidence.length,status:attempt.status}));
