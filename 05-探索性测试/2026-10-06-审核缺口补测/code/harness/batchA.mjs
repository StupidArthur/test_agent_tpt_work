import { saveResult, callEvents } from './results.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const resultDir = path.join(root, '结果');
const histDir = path.join(resultDir, '历史');

export function saveBatchResult(caseId, fields) {
  const target = path.join(resultDir, caseId + '.json');
  if (fs.existsSync(target)) {
    const attempt = fields.attempt_id || 'attempt';
    const d = path.join(histDir, caseId);
    fs.mkdirSync(d, { recursive: true });
    fs.copyFileSync(target, path.join(d, attempt + '.json'));
  }
  return saveResult(caseId, fields);
}

export { callEvents };

// update context skill_name to the batch skill
const ctxPath = path.join(root, '运行上下文.json');
const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
ctx.skill_name = 'fast-assert-skillc-20261006-agent2';
ctx.binding_sources.skill_name = { kind: 'fixture', path: '夹具/基础/20261006-agent2/skill-c/SKILL.md' };
fs.writeFileSync(ctxPath, JSON.stringify(ctx, null, 2) + '\n', 'utf8');
console.log('batchA results helper ready; skill_name ->', ctx.skill_name);
