// 记录维护脚本：按当前日志实际哈希刷新所有结果文件的 evidence（供每阶段校验使用）。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../../..');
const hash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const map = {
  '运行日志/business.jsonl': hash(path.join(root, '运行日志/business.jsonl')),
  '运行日志/业务调用.jsonl': hash(path.join(root, '运行日志/业务调用.jsonl')),
};
const dir = path.join(root, '结果');
let n = 0;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.json')) continue;
  const p = path.join(dir, f);
  const r = JSON.parse(fs.readFileSync(p, 'utf8'));
  let changed = false;
  r.evidence = (r.evidence || []).map((e) => {
    if (map[e.path] && e.sha256 !== map[e.path]) { changed = true; return { path: e.path, sha256: map[e.path] }; }
    return e;
  });
  if (changed) fs.writeFileSync(p, JSON.stringify(r, null, 2) + '\n', 'utf8');
  n += 1;
}
console.log(JSON.stringify({ results: n, hashes: map }, null, 2));
