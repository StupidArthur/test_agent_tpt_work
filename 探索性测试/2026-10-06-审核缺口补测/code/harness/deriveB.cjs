// Append a derived per-item status read for G14-06 (root cannot be judged without explicit skip feedback).
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..', '..');
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));
const env = JSON.parse(fs.readFileSync(path.join(root, '环境记录.json'), 'utf8'));
const log = createRecorder(root, { environment_id: env.environment_id, group: 'business' });
const lines = fs.readFileSync(path.join(root, '运行日志', 'business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const src = lines.filter((e) => e.target === '混合导入逐项结果' && e.kind === 'read').at(-1);
const RUN = '20261006-agent2';
const DECLARED = { valid: 'fast-assert-mixed-valid-' + RUN, root: 'fast-assert-root-' + RUN, invalid: 'fast-assert-mixed-invalid-' + RUN };
(async () => {
  const reg = JSON.parse(fs.readFileSync('C:\\Users\\Administrator\\.tpt-work\\dsh\\skills-manager\\skill-registry.json', 'utf8')).entries;
  const keys = Object.keys(reg);
  const value = {
    [DECLARED.valid]: keys.includes(DECLARED.valid) ? '成功' : null,
    [DECLARED.root]: null, // no explicit skip feedback; do not infer from prior presence
    [DECLARED.invalid]: keys.includes(DECLARED.invalid) ? '成功' : null,
  };
  const e = await log.read('混合导入逐项结果(派生)', 'mixed.status.derived', {
    channel: 'derived', scope: '注册表身份与导入反馈', locator: 'skill-registry.json + dialog', event_refs: [src.event_id],
  }, async () => ({
    value,
    raw: { source_event: src.event_id, registry_has: { valid: keys.includes(DECLARED.valid), root: keys.includes(DECLARED.root), invalid: keys.includes(DECLARED.invalid) }, dialog: src.raw && src.raw.dialog },
    derivation: 'per declared name: imported if registry key present; root null because no explicit skip feedback was shown',
  }));
  console.log(JSON.stringify({ derived: e.event_id, value }));
})();
