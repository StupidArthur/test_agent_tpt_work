// Test-harness result writer/refresher. Not a product business function.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
export const compare = require(path.join(root, 'tools', 'compare.cjs'));
export const rel = (p) => path.relative(root, p).replaceAll('\\', '/');
export const sha256File = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
export const loadCases = () => JSON.parse(fs.readFileSync(path.join(root, '用例', 'cases.json'), 'utf8'));
export const loadContext = () => JSON.parse(fs.readFileSync(path.join(root, '运行上下文.json'), 'utf8'));

const LOG_FILES = ['运行日志/business.jsonl', '运行日志/业务调用.jsonl'];

function evidence() {
  return LOG_FILES.filter((p) => fs.existsSync(path.join(root, p))).map((p) => ({ path: p, sha256: sha256File(p) }));
}

export function saveResult(caseId, fields) {
  const c = loadCases().find((x) => x.id === caseId);
  if (!c) throw new Error('unknown case ' + caseId);
  const ctx = loadContext();
  const out = [];
  const verdicts = [];
  for (const a of c.assertions) {
    const v = (fields.assertions || []).find((x) => x.id === a.id);
    if (!v) {
      out.push({ id: a.id, actual: null, read_refs: [], reason: 'assertion not collected', failed_dependency: 'execution gap' });
      verdicts.push(null);
      continue;
    }
    let expected = a.expected;
    if (typeof expected === 'string' && expected.startsWith('$')) expected = ctx[expected.slice(1)];
    const verdict = expected === undefined ? null : compare(a.operator, v.actual, expected);
    verdicts.push(verdict);
    out.push({ id: a.id, actual: v.actual, read_refs: v.read_refs || [], ...(v.reason ? { reason: v.reason } : {}), ...(v.failed_dependency ? { failed_dependency: v.failed_dependency } : {}) });
  }
  const status = verdicts.includes(false) ? '失败' : verdicts.includes(null) ? '不确定' : '通过';
  const result = {
    case_id: caseId,
    contract_version: c.contract_version,
    attempt_id: fields.attempt_id,
    environment_id: fields.environment_id,
    object_identity: fields.object_identity,
    inputs: fields.inputs ?? [],
    action_refs: fields.action_refs ?? [],
    status,
    started_at: fields.started_at,
    ended_at: fields.ended_at,
    actual_steps: fields.actual_steps ?? [],
    assertions: out,
    evidence: fields.evidence ?? evidence(),
    cleanup: fields.cleanup ?? { status: 'unchanged', description: '本轮未修改可逆设置或资产', read_refs: [] },
    ...(fields.business_call_refs ? { business_call_refs: fields.business_call_refs } : {}),
    notes: fields.notes ?? '',
  };
  fs.mkdirSync(path.join(root, '结果'), { recursive: true });
  fs.writeFileSync(path.join(root, '结果', caseId + '.json'), JSON.stringify(result, null, 2) + '\n', 'utf8');
  return { status, result };
}

export function loadEvents() {
  const file = path.join(root, '运行日志', 'business.jsonl');
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
}
export function loadCalls() {
  const file = path.join(root, '运行日志', '业务调用.jsonl');
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
}
export function callEvents(callId) {
  return loadEvents().filter((e) => e.business_call_id === callId);
}
export function lastCall(functionName) {
  const calls = loadCalls().filter((c) => c.function_name === functionName);
  return calls[calls.length - 1];
}

export function refreshAllEvidence() {  const dir = path.join(root, '结果');
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const p = path.join(dir, f);
    const r = JSON.parse(fs.readFileSync(p, 'utf8'));
    r.evidence = (r.evidence || []).map((e) => ({ ...e, sha256: sha256File(e.path) }));
    fs.writeFileSync(p, JSON.stringify(r, null, 2) + '\n', 'utf8');
  }
}
