// 生成 证据索引.jsonl：从 运行日志/业务调用.jsonl 汇总每次调用的函数、调用ID、路径与 SHA-256，
// 并按 CASE_MAP 关联 case/subcheck。保留脚本供审核。用法：node build-evidence.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const taskRoot = path.resolve(here, '..', '..');
const logPath = path.join(taskRoot, '运行日志', '业务调用.jsonl');
const outPath = path.join(taskRoot, '证据索引.jsonl');

const CASE_MAP = {
  'CALL-e6a9cde4': 'MEM-01/S1',
  'CALL-0d3b0c56': 'MEM-01/S2,S3;MEM-12/S1',
  'CALL-bef582d2': 'MEM-01/S4;MEM-05;MEM-15/S1;MEM-07/S1',
  'CALL-7be8a1c4': 'MEM-01/S5',
  'CALL-20453520': 'MEM-02/S1,S2',
  'CALL-813bf9e0': 'MEM-02/S2,S5',
  'CALL-04c35531': 'MEM-02/S3',
  'CALL-5c8b0add': 'MEM-02/S3,S4,S6;MEM-05',
  'CALL-3bef6870': 'MEM-05;MEM-16/S1,S3',
  'CALL-4c5207f5': 'MEM-03',
  'CALL-d8dfdbbd': 'MEM-03/S1',
  'CALL-ade901f9': 'MEM-03/S1,S4',
  'CALL-f20d6b88': 'MEM-03/S1',
  'CALL-fa91fbd5': 'MEM-04/S1',
  'CALL-5ed2ae84': 'MEM-04/S1,S3',
  'CALL-9d3d1ab1': 'MEM-05/S4;MEM-06/S1;MEM-17',
  'CALL-f64c310f': 'MEM-17/S1',
  'CALL-91498b16': 'MEM-08',
  'CALL-52541fd3': 'MEM-18/会话核对',
  'CALL-4673afa3': 'MEM-13/S1',
  'CALL-3e359d9b': 'MEM-18/S1',
  'CALL-7e4679df': 'MEM-18/S1',
  'CALL-e8671f00': 'MEM-18/S1',
  'CALL-8c424ccd': 'MEM-18/S1',
  'CALL-1b0f7b0d': 'MEM-18/S2',
  'CALL-9c59847b': 'MEM-18/S2',
  'CALL-02cca5e4': 'MEM-18/S2',
  'CALL-fd092d9b': 'MEM-18/S2',
  'CALL-6ebaa1cd': 'MEM-18/S2',
  'CALL-9d3d1ab1': 'MEM-05/S4;MEM-06/S1;MEM-17/S1,S2,S3,S4',
  'CALL-4673afa3': 'MEM-13/S1',
};

const lines = fs.readFileSync(logPath, 'utf8').split(/\r?\n/).filter(Boolean);
const out = [];
for (const line of lines) {
  let r;
  try { r = JSON.parse(line); } catch { continue; }
  if (r.kind !== 'business_call') continue;
  const short = (r.call_id || '').slice(0, 13);
  out.push({
    case_subcheck: CASE_MAP[short] || '',
    function: r.function_name,
    function_version: r.function_version,
    call_id: r.call_id,
    status: r.status,
    started_at: r.started_at,
    args_path: r.args_path,
    args_sha256: r.args_sha256,
    return_path: r.return_path,
    return_sha256: r.return_sha256,
    modules: (r.modules || []).map((m) => ({ path: m.path, sha256: m.sha256, snapshot: m.snapshot })),
  });
}
fs.writeFileSync(outPath, out.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
console.log('wrote', outPath, out.length, 'entries');
