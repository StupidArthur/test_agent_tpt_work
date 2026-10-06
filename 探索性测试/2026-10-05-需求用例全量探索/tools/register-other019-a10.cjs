const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve('探索性测试/2026-10-05-需求用例全量探索');
const evidenceDir = path.join(root, '证据/SETTINGS-LINK-NIGHT2-20261006');
const rel = p => path.relative(root, p).replace(/\\/g, '/');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8');

const evidence = [
  ['current-settings-baseline.json', 'JSON', '初始UI状态：网页链接应用内侧栏、代码工具开启、繁忙排队、搜索会话Ctrl+K。'],
  ['current-settings-baseline.png', '截图', '初始设置与快捷键状态界面。'],
  ['chat-anchor-render.png', '截图', '对话中真实渲染的ROUND_CHAT_LINK_20261006锚点及目标地址。'],
  ['sidebar-click-before.png', '截图', '点击应用内侧栏模式的可见目标链接前。'],
  ['sidebar-click-after.png', '截图', '点击后TPT Work内Browser侧栏加载Round Link Target及marker。'],
  ['link-default-browser-selected.png', '截图', '网页链接默认方式切换为默认浏览器。'],
  ['browser-click-before.png', '截图', '默认浏览器模式下点击同一可见目标链接前。'],
  ['browser-click-after.png', '截图', '默认浏览器打开本轮localhost target。'],
  ['browser-page-rendered.png', '截图', '外部浏览器呈现本轮Round Link Target静态页面。'],
  ['requests.jsonl', 'HTTP请求日志', '本轮静态夹具收到应用Electron导航与Chrome导航请求；服务关闭记录。'],
  ['server-info.json', 'JSON', '仅绑定127.0.0.1的本轮静态链接夹具服务信息。'],
  ['link-sidebar-restored.png', '截图', '网页链接设置恢复应用内侧栏。'],
  ['code-diff-on-view.png', '截图', '代码工具开启时查看到round-owned JS的第1轮差异与+1/-0。'],
  ['code-diff-off-setting.png', '截图', '代码工具关闭状态设置界面。'],
  ['code-diff-off-task-complete.png', '截图', '关闭状态下工作区工具仍改写本轮JS；该轮没有Trace或改动卡片。'],
  ['code-tools-on-restored.png', '截图', '代码工具恢复开启。'],
  ['queue-send-attempt.png', '截图', 'Queue设置下第一任务运行时提交唯一第二消息，界面显示互补快捷键提示。'],
  ['queue-final.png', '截图', 'Queue下第一任务完成后，第二条消息作为后续独立轮次得到回应。'],
  ['insert-send-attempt.png', '截图', 'Insert设置下第一任务运行期间提交唯一第二消息，消息已进入当前对话。'],
  ['insert-after-completion.png', '截图', 'Insert尝试中第一轮最终完成后处理第二消息；仅记录时序，不外推消息语义。'],
  ['shortcut-control-k.png', '截图', '焦点离开编辑器后一次Control+K按键仍未打开搜索会话输入。'],
  ['final-settings-restored.png', '截图', '最终UI设置回读：应用内侧栏、代码工具开启、排队发送。'],
  ['final-settings-restored.json', 'JSON', '最终设置回读的可访问UI文字及代码工具开关状态。'],
];

const assertions = {
  attempt_id: 'OTHER-019-A10', observation_id: 'OBS-269',
  captured_at: '2026-10-06T03:27:38.332Z', environment_id: 'ENV-001',
  surface: 'TPT Work UI via CDP 9234 + Playwright; visible settings, conversation, Browser sidebar and local target browser',
  initial_settings: { webpage_link: '应用内侧栏', code_work_tools: true, busy_send: '排队发送', search_shortcut: 'Ctrl+K', model: 'standard / low', permission: 'workspace modifications' },
  link_route: {
    anchor_label: 'ROUND_CHAT_LINK_20261006',
    target: 'http://127.0.0.1:14325/target?marker=chat-rendered-20261006',
    sidebar_mode: { observed: 'TPT Work Browser侧栏显示本轮页面标题、URL与内容；requests.jsonl中GET /target的User-Agent含Electron/44.0.0，Sec-Fetch-Mode=navigate、Dest=document。', verdict: '符合' },
    default_browser_mode: { observed: '切换为默认浏览器后点击相同链接，requests.jsonl出现目标GET，User-Agent含Chrome/154.0.0.0而非Electron。', verdict: '符合' },
    helper: '本轮服务仅绑定127.0.0.1，已POST /shutdown并退出。'
  },
  code_work_tools: {
    setting_copy: '开启后显示轨迹、本轮代码差异，新对话中的 Agent 预设切换',
    on: '新任务对本轮JS创建+1/-0改动卡片；UI打开的差异面板显示第1轮改动。',
    off: '新任务仍能经工作区工具修改同一本轮JS；该轮Trace入口/代码差异卡片不可见。',
    separate_gate: '新任务“标准模式”入口disabled，title为“到设置里开启「允许切换agent模式」后即可切换”；未更改此独立设置，Agent预设切换未验证。',
    restored: true
  },
  busy_send: {
    queue: { setting: '排队发送', task_started_at: '2026-10-06T03:20:30.664Z', second_submitted_at: '2026-10-06T03:20:31.572Z', first_result: '约27秒后完成；QUEUE_SECOND_20261006作为后续独立轮次在6秒后得到单独回应。' },
    insert: { setting: '插话发送', task_started_at: '2026-10-06T03:22:41.283Z', second_submitted_at: '2026-10-06T03:22:42.177Z', first_result: '第二条消息在首任务仍显示探索中时即进入对话；首轮约56秒后结束，之后可见第二消息处理结果。工作区文件位置与首提示不同且出现代码搜索，故文件输出内容不作为通过断言。' },
    interpretation: '两次都成功提交。证据支持队列模式在首轮完成后单独应答、插话模式在运行期间立即显示输入消息；不推断取消/中断或优先级语义。原值已恢复排队发送。'
  },
  shortcut: { baseline: '快捷键速查显示搜索会话 Ctrl+K', focus_before: '点击空白后document.activeElement为BODY，isContentEditable=false', action: '仅一次Playwright/CDP Control+k', result: '搜索会话输入仍不可见；不能证明合成事件等同物理键盘，判未验证。' },
  final_settings: { webpage_link: '应用内侧边栏', code_work_tools: true, busy_send: '排队发送', shortcut: 'Ctrl+K未改' },
  residuals: ['外部Chrome中可能仍保留本轮localhost目标页；当前无其CDP目标，未操作/未关闭进程。', '在D:\\code\\tpt-workspace中有本轮专属代码工具样本（SETTINGS_CODE_DIFF_ON_ROUND20261006.js、SETTINGS_CODE_EFFECT_ON_ROUND20261006.txt、SETTINGS_CODE_EFFECT_OFF_ROUND20261006.txt）；后续清理任务位于隔离临时task workspace并回报三文件原本缺失，未确认删除原项目样本。队列夹具也位于独立task workspace。样本归属本轮，无既有用户资产被覆盖；清理未完成。']
};
const assertionsPath = path.join(evidenceDir, 'runtime-assertions.json');
writeJson(assertionsPath, assertions);
evidence.push(['runtime-assertions.json', 'JSON', '本轮四项UI对照的实际运行时值、目标URL、时序、设置恢复与结论范围。']);

const obs = {
  observation_id: 'OBS-269', recorded_at: '2026-10-06T03:27:38.332Z', related_cases: ['OTHER-019'],
  category: 'settings UI behavior with round-owned target, work sample, and active-message comparison',
  scope: 'OTHER-019-A10 only; existing tpt-workspace; TPT Work standard/low; loopback target on 127.0.0.1; no production endpoint or existing user file intentionally edited',
  observation: '网页锚点实际点击分别进入TPT Work Browser侧栏及外部Chrome；代码工具开时显示Trace/JS差异、关时隐藏相关入口但仍可调用工作区文件工具；繁忙排队消息在首轮完成后单独应答，插话消息在首轮运行时立即显示并于首轮后被处理；单次Control+K未使搜索输入可见。所有可逆设置恢复到初始值。',
  candidate_status: 'pending bilateral review; no product defect asserted', evidence: [],
};

for (const [name, type, proves] of evidence) {
  const full = path.join(evidenceDir, name);
  if (!fs.existsSync(full)) throw new Error(`missing evidence ${name}`);
  const item = { path: rel(full), case_id: 'OTHER-019', attempt_id: 'OTHER-019-A10', observation_id: 'OBS-269', captured_at: '2026-10-06T02:53:10Z–2026-10-06T03:27:38Z', type, proves, redacted: true, sha256: hash(full) };
  obs.evidence.push(item);
}

const casePath = path.join(root, '执行记录/OTHER-019.json');
const data = readJson(casePath);
if (data.attempts.some(a => a.attempt_id === 'OTHER-019-A10')) throw new Error('A10 already registered');
if (data.latest_attempt_id !== 'OTHER-019-A09') throw new Error(`unexpected latest attempt ${data.latest_attempt_id}`);
const allEv = evidence.map(([name]) => rel(path.join(evidenceDir, name)));
data.attempts.push({
  attempt_id: 'OTHER-019-A10', started_at: '2026-10-06T02:53:10.636Z', ended_at: '2026-10-06T03:27:38.332Z', environment_id: 'ENV-001',
  surface: 'TPT Work UI via CDP 9234 + Playwright; settings, new tasks, conversation, Browser sidebar, round-owned localhost page',
  actual_preconditions: { account_alias: 'Arthur', workspace: 'existing tpt-workspace', project: 'existing project; no project created', model: 'standard / low', permission: 'workspace modifications; only round-owned samples', initial_settings: assertions.initial_settings, fixtures: ['127.0.0.1:14325 static anchor/target; stopped', 'round-owned JS/text test samples; no existing user file intended to be changed'] },
  input: '按有限队列对网页链接目标路由、代码工作工具开关可见效果、繁忙时Queue/Insert提交时序、Ctrl+K搜索触发各做一次有判别力对照；不扩大到其他设置。',
  actual_steps: [
    '读取初值：应用内侧栏、代码工作工具true、繁忙排队、搜索会话Ctrl+K；模型standard/low。',
    '通过本轮静态HTML链接锚点真实UI点击：应用内侧栏模式加载本轮target；改为默认浏览器后再次点击，相同marker由Chrome请求；随后恢复应用内侧栏并停止localhost服务。',
    '代码工具true时新任务修改本轮JS并通过可见改动卡片打开差异面板；false时另一个新任务修改本轮JS，Trace入口和差异卡片未见，工作区工具仍执行；恢复true。Agent模式切换另有独立disabled gate，未更改。',
    '排队模式下启动本轮120行合成文件任务，正在运行时按Enter提交唯一第二消息；首轮结束后该消息独立应答。切为插话模式后对既有round-owned fixture做一次只读任务，运行中按Enter提交唯一第二消息；消息在首轮运行期间即显示，首轮完成后出现后续处理。只判定提交时序，不判定中断语义或任务文件输出。',
    '恢复排队发送；先将焦点置于body且读取activeElement=BODY，再按一次Control+k；搜索会话输入仍隐藏，不重试。最终回读全部设置初值。'
  ],
  wait_condition: '等待各任务显示完成或已记录的最终界面状态；busy-send按首轮完成与第二消息回应先后判定；快捷键一次按键后检查搜索输入可见性。',
  checkpoints: [
    { expected_index: 1, expected: '对话链接按网页链接打开方式路由到可见目标', observed: '同一真实渲染锚点点击后，应用内侧栏请求目标并呈现页面；默认浏览器设置下Chrome请求同一目标。', verdict: '符合', evidence: ['证据/SETTINGS-LINK-NIGHT2-20261006/chat-anchor-render.png','证据/SETTINGS-LINK-NIGHT2-20261006/sidebar-click-after.png','证据/SETTINGS-LINK-NIGHT2-20261006/requests.jsonl'] },
    { expected_index: 2, expected: '代码工作工具开关的可见效果有差别', observed: '开启时Trace与本轮JS差异入口可见；关闭时工具调用仍运行但Trace/差异UI不显示。新对话Agent预设能力被独立设置gate禁用，本轮未验证。', verdict: '符合', evidence: ['证据/SETTINGS-LINK-NIGHT2-20261006/code-diff-on-view.png','证据/SETTINGS-LINK-NIGHT2-20261006/code-diff-off-task-complete.png','证据/SETTINGS-LINK-NIGHT2-20261006/code-tools-on-restored.png'] },
    { expected_index: 3, expected: '忙碌时Queue与Insert模式的第二消息提交/响应时序可比较', observed: '两次唯一第二消息均真实提交；Queue下在首轮完成后单独应答，Insert下在首轮运行时立即显示，首轮完成后再被处理。首轮文件读取时发现路径漂移和代码搜索，排除该文件输出断言。', verdict: '符合', evidence: ['证据/SETTINGS-LINK-NIGHT2-20261006/queue-send-attempt.png','证据/SETTINGS-LINK-NIGHT2-20261006/queue-final.png','证据/SETTINGS-LINK-NIGHT2-20261006/insert-send-attempt.png','证据/SETTINGS-LINK-NIGHT2-20261006/insert-after-completion.png'] },
    { expected_index: 4, expected: 'Ctrl+K从非编辑焦点触发搜索会话', observed: 'body为焦点且不可编辑；一次CDP Control+k后搜索会话输入仍不可见。合成事件无法替代真实键盘验证。', verdict: '未验证', evidence: ['证据/SETTINGS-LINK-NIGHT2-20261006/shortcut-control-k.png','证据/SETTINGS-LINK-NIGHT2-20261006/current-settings-baseline.json'] }
  ],
  observed_result: '本轮四项有三项得到有限UI行为证据（目标路由、Trace/差异显示、繁忙消息时序）；Ctrl+K按键效果在一次合成事件中未触发搜索，保留未验证。',
  status: '已执行-结论不确定', evidence: allEv, difference_ids: [], notes: '不对合成快捷键结果判为产品差异；不把代码工具关闭解释成禁止工具调用；不外推Agent preset切换；queue/insert只陈述可见提交与回应先后。设置值恢复成功。round-owned文件清理未完整确认，详见runtime-assertions.json。所有结论待双方审核。'
});
data.latest_attempt_id = 'OTHER-019-A10';
data.status = '已执行-结论不确定';
data.notes = 'A10补充实际链接路由、代码工具差异显示、繁忙Queue/Insert消息提交时序；Ctrl+K合成按键仍未触发搜索且物理键效果未验证。基线恢复已回读；残留round-owned临时文件/外部Chrome页详见A10。此前A09及更早尝试保留；结论待双方审核。';
data.audit_history.push({ at: '2026-10-06T03:27:38.332Z', event: 'OTHER-019-A10 appended after finite four-item UI comparison; preserved A09 history; settings restored; no defect classification; see runtime assertions and evidence hashes.' });
writeJson(casePath, data);

const obsRecordPath = path.join(root, '观察记录.jsonl');
const observationLog = fs.readFileSync(obsRecordPath, 'utf8').trimEnd().split(/\r?\n/);
if (observationLog.some(line => { try { return JSON.parse(line).observation_id === 'OBS-269'; } catch { return false; } })) throw new Error('OBS-269 already exists');
fs.appendFileSync(obsRecordPath, JSON.stringify(obs) + '\n', 'utf8');
const observationFile = path.join(evidenceDir, 'OTHER-019-A10-observations.json');
writeJson(observationFile, obs);
const observationEvidence = { path: rel(observationFile), case_id: 'OTHER-019', attempt_id: 'OTHER-019-A10', observation_id: 'OBS-269', captured_at: '2026-10-06T03:27:38.332Z', type: 'JSON', proves: 'A10四项受限对照的运行时断言与范围限定观察。', redacted: true, sha256: hash(observationFile) };
const idxPath = path.join(root, '证据/索引.jsonl');
fs.appendFileSync(idxPath, evidence.map(([name]) => {
  const full = path.join(evidenceDir, name);
  return JSON.stringify({ path: rel(full), case_id: 'OTHER-019', attempt_id: 'OTHER-019-A10', observation_id: 'OBS-269', captured_at: '2026-10-06T02:53:10Z–2026-10-06T03:27:38Z', type: name.endsWith('.png') ? '截图' : name.endsWith('.jsonl') ? 'HTTP请求日志' : 'JSON', proves: evidence.find(x => x[0] === name)[2], redacted: true, sha256: hash(full) });
}).concat([JSON.stringify(observationEvidence)]).join('\n') + '\n', 'utf8');
// Append the just-completed case entry to the overview without altering prior history.
const matrixPath = path.join(root, '设置逐项清单-夜间续跑.md');
let matrix = fs.readFileSync(matrixPath, 'utf8');
const replacements = [
  ['常规：网页链接默认打开方式', '| 常规：网页链接默认打开方式 | 应用内侧边栏 | A10真实点击同一ROUND_CHAT_LINK_20261006锚点：应用内侧栏在TPT Browser侧栏呈现本轮target；默认浏览器时Chrome请求相同marker。 | 恢复应用内侧栏；最终设置UI回读 | 两种路由效果均有直接UI/HTTP证据，待审核。OTHER-019-A10；证据/SETTINGS-LINK-NIGHT2-20261006/requests.jsonl |'],
  ['常规：代码工作工具', '| 常规：代码工作工具 | 开启=true | 开启态本轮JS编辑显示改动卡片并可打开差异；关闭态新任务仍能执行工作区修改，但Trace/差异入口不可见。UI原文：开启后显示轨迹、本轮代码差异，新对话中的 Agent 预设切换。新会话Agent模式另有disabled gate，未验证。 | 恢复true并回读 | 仅验证Trace/差异显示开关，不声称关闭会禁用工具或验证Agent预设。OTHER-019-A10；证据/SETTINGS-LINK-NIGHT2-20261006/code-diff-on-view.png |'],
  ['常规：忙碌时发送', '| 常规：忙碌时发送 | 排队发送 | Queue模式：第二消息在首任务完成后单独应答；Insert模式：第二消息在首任务运行时立即显示，首轮结束后出现后续处理。只记提交/时序，不推断中断语义；一次Insert任务存在路径漂移/代码搜索，文件输出不作为断言。 | 恢复排队发送并回读 | 可见消息时序对照已完成，待审核。OTHER-019-A10；证据/SETTINGS-LINK-NIGHT2-20261006/queue-final.png |'],
  ['常规：快捷键—搜索会话', '| 常规：快捷键—搜索会话 | Ctrl+K | 焦点置于BODY且不可编辑后仅按一次CDP Control+k；搜索输入仍不可见。 | 快捷键配置未改；Ctrl+K保持 | 合成事件未触发，真实键盘效果仍未验证；未重试。OTHER-019-A10；证据/SETTINGS-LINK-NIGHT2-20261006/shortcut-control-k.png |']
];
for (const [key, replacement] of replacements) {
  const lines = matrix.split(/\r?\n/);
  const i = lines.findIndex(l => l.includes(key));
  if (i < 0) throw new Error(`matrix row not found: ${key}`);
  lines[i] = replacement;
  matrix = lines.join('\n');
}
matrix += '\n\n## OTHER-019-A10运行时对照与恢复（2026-10-06）\n\n四项有限UI对照已执行。最终可回读设置为应用内侧栏、代码工具开启、繁忙排队发送、搜索会话Ctrl+K未改；快捷键物理输入仍未验证。round-owned文件清理未完成：清理任务在隔离task workspace报告这些文件不在其根目录，未确认原tpt-workspace样本已删除。外部Chrome可能仍保留本轮localhost页面；localhost服务已停止。细节及SHA-256见 OTHER-019-A10 与 OBS-269。\n';
fs.writeFileSync(matrixPath, matrix, 'utf8');

const summaryPath = path.join(root, '总结与审核.md');
fs.appendFileSync(summaryPath, '\n\nOTHER-019-A10（2026-10-06）：对网页链接实际路由、代码工具开关的Trace/差异显示、忙碌时Queue/Insert消息时序、Ctrl+K各做一次有限检查。前两项观察到设置对应的UI效果，Queue/Insert消息均真实提交并呈现不同提交时序；Ctrl+K单次Playwright/CDP合成事件未显示搜索输入，保持未验证。全部设置恢复到初始值。所有记录待双方审核；不登记产品差异。round-owned文件与外部Chrome标签的残留限制见设置矩阵与OBS-269。\n', 'utf8');
fs.appendFileSync(path.join(root, '变更清单.md'), '\n| CL-33 | OTHER-019-A10 | 本轮localhost静态链接、round-owned JS/text与120行合成fixture用于有限设置对照；设置按原值恢复 | 链接服务已停止；外部Chrome页可能仍开；TPT内部目标页已关闭。工作区本轮测试文件清理未完全确认，未触碰既有用户资产 | OTHER-019-A10；证据/SETTINGS-LINK-NIGHT2-20261006/；所有最终结论待双方审核 |\n', 'utf8');
fs.appendFileSync(path.join(root, '覆盖地图.md'), '\n\nOTHER-019-A10有限覆盖补充：同一可见本轮HTML锚点分别验证应用内侧栏与Chrome目标路由；代码工具开/关验证Trace/差异UI可见性但未验证Agent预设gate；繁忙时Queue/Insert都成功提交消息并观察到处理时序差异；Ctrl+K合成按键未打开搜索，保持未验证。四项后设置恢复回读。现有任务覆盖总数不因复核重跑而虚增；计数以progress.cjs为准。证据及运行时断言见OTHER-019-A10/OBS-269，待审核。\n', 'utf8');

console.log(JSON.stringify({attempt: 'OTHER-019-A10', observation: 'OBS-269', indexedEvidence: evidence.length + 1, sha256: evidence.map(([name]) => [name, hash(path.join(evidenceDir, name))]).concat([['OTHER-019-A10-observations.json', hash(observationFile)]])}, null, 2));
