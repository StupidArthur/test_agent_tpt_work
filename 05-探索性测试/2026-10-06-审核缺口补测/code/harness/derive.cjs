// Append derived boolean read events referencing already-recorded live observations,
// to add the raw+derivation required for boolean aggregates without falsifying the source read.
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..', '..');
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));
const env = JSON.parse(fs.readFileSync(path.join(root, '环境记录.json'), 'utf8'));
const log = createRecorder(root, { environment_id: env.environment_id, group: 'business' });

function findEvent(id) {
  const lines = fs.readFileSync(path.join(root, '运行日志', 'business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean);
  for (const l of lines) { const e = JSON.parse(l); if (e.event_id === id) return e; }
  return null;
}

const items = [
  { source: 'business-5ad6619c-cfca-449a-aa55-d29b03875421-4', target: '缺文件包提交反馈(布尔派生)', objectId: 'experts.import.missing-agent.derived', re: /agent\.md|必填文件|缺少.{0,6}文件/i, label: 'agent.md/必填文件' },
  { source: 'business-5ad6619c-cfca-449a-aa55-d29b03875421-11', target: '坏JSON提交反馈(布尔派生)', objectId: 'experts.import.bad-json.derived', re: /metadata\.json|JSON|格式/i, label: 'metadata.json/JSON/格式' },
  { source: 'business-0626ea23-4434-4d27-bae4-252a1e811ece-4', target: '缺name导入反馈(布尔派生)', objectId: 'skills.import.missing-name.derived', re: /缺少|缺失|必填|无效|错误|失败|不合法|不符合|需要/, label: '缺name拒绝反馈' },
  { source: 'business-70e10507-2350-49c9-8975-f6605ddb229c-9', target: '缺description导入反馈(布尔派生)', objectId: 'skills.import.missing-description.derived', re: /缺少|缺失|必填|无效|错误|失败|不合法|不符合|需要/, label: '缺description拒绝反馈' },
];

(async () => {
  const out = {};
  for (const it of items) {
    const src = findEvent(it.source);
    if (!src) { console.log('missing source', it.source); continue; }
    const dialogOpen = src.raw && (src.raw.dialog_open ?? (src.raw && src.raw.present) ?? true);
    const text = (src.raw && (src.raw.dialog ?? src.raw.text)) || '';
    const value = !!dialogOpen && it.re.test(text) && !/已跳过同名/.test(text);
    const e = await log.read(it.target, it.objectId, {
      channel: 'derived',
      scope: src.source.scope,
      locator: src.source.locator,
      event_refs: [it.source],
    }, async () => ({ value, raw: { source_event: it.source, dialog: text, dialog_open: dialogOpen, matched: it.re.test(text) }, derivation: `dialog_open && text matches ${it.label} && not same-name-skip` }));
    out[it.objectId] = e.event_id;
  }
  console.log(JSON.stringify(out, null, 2));
})();
