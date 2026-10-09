// Append a derived read for G8-08 product-card identity when no card resource path exists.
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..', '..');
const { createRecorder } = require(path.join(root, 'tools', 'record.cjs'));
const env = JSON.parse(fs.readFileSync(path.join(root, '环境记录.json'), 'utf8'));
const log = createRecorder(root, { environment_id: env.environment_id, group: 'business' });
const lines = fs.readFileSync(path.join(root, '运行日志', 'business.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const src = lines.filter((e) => e.target === '当前任务产物文件身份' && e.kind === 'read').at(-1);
const cards = (src.raw && src.raw.cards) || [];
const withPath = cards.find((c) => c.href);
(async () => {
  const value = withPath ? withPath.href.replace(/\//g, '\\').toLowerCase() === (src.raw.deliver_abs || '').toLowerCase() : null;
  const e = await log.read('当前任务产物文件身份(派生)', 'deliver.product-card.derived', {
    channel: 'derived', scope: '本轮会话/产物文件卡资源路径', locator: '[class*="fileLink"],[data-slot*="file"]', event_refs: [src.event_id],
  }, async () => ({
    value,
    raw: { source_event: src.event_id, cards, deliver_abs: src.raw.deliver_abs },
    reason: value === null ? '未找到带实际资源绝对路径的产物卡，仅有工具步骤内相对路径fileLink' : undefined,
    derivation: 'product card resource path equals deliver.txt absolute path; null when no card exposes a path',
  }));
  console.log(JSON.stringify({ derived: e.event_id, value }));
})();
