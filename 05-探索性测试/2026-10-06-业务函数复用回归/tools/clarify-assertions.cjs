const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const file = path.join(root, '用例/cases.json');
if (fs.readdirSync(path.join(root, '结果')).some(n => n.endsWith('.json'))) throw new Error('已有结果，不能调整进行中的用例');
const original = fs.readFileSync(file);
const cases = JSON.parse(original);
const changes = {
  'G3-04-A1': '仅读取本轮session、本次请求轨迹内的skill_content资源标识，或状态明确成功的skill工具记录name；保存记录原文及成功状态。不能在整个main/body搜索名称，失败工具或其他轮记录不计入。无法区分本次记录则actual=null并写原因。',
  'G5-02-A1': '仅读取本轮session、本次请求轨迹内专家正文注入记录的资源标识；保存该记录原文和成功状态，或明确展示已加载正文的记录。仅出现名称、composer引用、整页文本命中不算成功注入；没有可判别记录则actual=null并写原因。',
  'G5-07-A1': '提交已选缺agent.md包后，在wait.ui_ms内读取本次提交的可见错误提示或失败响应；提示须指出agent.md缺失或必填文件缺失才为true。保存完整反馈及原始状态。弹窗未关闭、列表不变、目录不存在不能替代拒绝反馈。提交已完成且到时无对应反馈为false；提交未完成或读取失败为null。',
  'G5-08-A1': '提交已选坏metadata.json包后，在wait.ui_ms内读取本次提交的可见错误提示或失败响应；提示须指出metadata.json/JSON解析或格式校验失败才为true。保存完整反馈及原始状态。弹窗未关闭、列表不变、目录不存在不能替代拒绝反馈。提交已完成且到时无对应反馈为false；提交未完成或读取失败为null。',
  'G9-07-A1': '提交缺技术name样本后，在wait.ui_ms内读取本次校验错误提示或失败响应，须指出name字段缺失/必填才为true；保存完整原文。未新增对象不能代替反馈。提交完成但无相应反馈为false；提交未完成或读取失败为null。',
  'G9-08-A1': '提交缺技术description样本后，在wait.ui_ms内读取本次校验错误提示或失败响应，须指出description字段缺失/必填才为true；保存完整原文。未新增对象不能代替反馈。提交完成但无相应反馈为false；提交未完成或读取失败为null。',
  'G10-07-A2': '仅读取本轮session、本次请求成功加载的目标skill_content记录正文，保存正文和资源身份；不从卡片、详情、用户请求或整个页面查标记。',
  'G10-08-A1': '修改并触发重读后，在wait.ui_ms内读取对应本轮技能的错误反馈，须指出本次无效字段或校验失败，保存完整原文；旧内容仍可调用不能替代反馈。触发完成但无对应反馈为false；触发/读取失败为null。',
  'G11-07-A1': '仅读取本轮专家session、本次请求成功加载的附带技能资源正文，核对安装路径/内部name并保存正文与成功记录；不从专家详情、用户请求或整页文本查标记。',
  'G11-12-A1': '刷新目标坏配置专家后，在wait.ui_ms内读取该对象的格式/校验错误提示或失败响应，保存对象身份及完整原文；详情打不开或文件不变不能替代错误反馈。刷新完成但无对应反馈为false；刷新/读取失败为null。',
  'G7-07-A2': '只读取当前草稿中目标未知格式附件卡的状态文本；明确出现解析成功/内容已识别等肯定声明为true，否则false。保存完整卡片文本；卡片无法定位或读取为null，不能把无法读取当作没有声明。',
  'G10-06-A2': '只读取目标二进制文件预览区的状态与正文；若显示对文件业务内容的解析结果或明确解析成功声明则true，仅名称/类型/大小及不支持预览说明则false。保存完整预览文本；无法定位或读取为null。',
  'G11-08-A2': '限定本次打开的编辑会话，读取可见编辑模式标签或composer上下文中明确表示修改/编辑该专家的文本，并保存原文；仅专家名称、普通对话入口或全页包含编辑二字不算。表面可读但无标识为false，无法读取为null。',
  'G13-04-A1': '点击创建专家后，仅在新打开的会话/面板读取明确的创建专家模式标签或预置创建专家指令，保存原文；导航按钮文字或普通空白会话不算。目标表面可读但无标识为false，无法读取为null。',
  'G13-11-A1': '点击创建技能后，仅在新打开的会话/面板读取明确的创建技能模式标签或预置创建技能指令，保存原文；导航按钮文字或普通空白会话不算。目标表面可读但无标识为false，无法读取为null。',
};
const ledger = [];
for (const c of cases) {
  const edits = [];
  for (const a of c.assertions) if (changes[a.id]) {
    edits.push({ assertion_id: a.id, before: a.read, after: changes[a.id] });
    a.read = changes[a.id];
  }
  if (edits.length) {
    const oldVersion = c.contract_version;
    c.contract_version = '2.1';
    if (['G5-07', 'G5-08', 'G9-07', 'G9-08'].includes(c.id)) {
      c.steps = [...c.steps, '提交前核对已选夹具身份及提交按钮可用；提交后分别读取对应校验反馈与列表变化，不互相替代'];
    }
    ledger.push({ case_id: c.id, old_version: oldVersion, new_version: c.contract_version, edits });
  }
}
if (ledger.length !== 15) throw new Error('修改目标数量不符');
const archive = path.join(root, '审核/case调整-判据澄清');
fs.mkdirSync(archive, { recursive: true });
const backup = path.join(archive, 'cases.before.json');
if (fs.existsSync(backup)) throw new Error('已执行过调整，不覆盖历史');
fs.writeFileSync(backup, original);
const updated = Buffer.from(JSON.stringify(cases, null, 2) + '\n');
fs.writeFileSync(file, updated);
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
fs.writeFileSync(path.join(archive, '变更.json'), JSON.stringify({ reason: '用户要求按三个简明规则澄清尚未执行用例，业务预期与数量不变', before_sha256: hash(original), after_sha256: hash(updated), changes: ledger }, null, 2) + '\n');
console.log(JSON.stringify({ changed_cases: ledger.length, total: cases.length, assertions: cases.reduce((n,c) => n+c.assertions.length,0) }));
