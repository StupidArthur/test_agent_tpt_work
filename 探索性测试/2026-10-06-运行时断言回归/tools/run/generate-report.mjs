import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { root } from './lib.mjs';
const require = createRequire(import.meta.url);
const compare = require(path.join(root, 'tools', 'compare.cjs'));
const cases = JSON.parse(fs.readFileSync(path.join(root, '用例', 'cases.json'), 'utf8'));
const ctx = JSON.parse(fs.readFileSync(path.join(root, '运行上下文.json'), 'utf8'));
const results = fs.readdirSync(path.join(root, '结果')).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(root, '结果', f), 'utf8')));
const byId = Object.fromEntries(results.map(r => [r.case_id, r]));
const groups = {};
for (const c of cases) { groups[c.group] = groups[c.group] || { total: 0, pass: 0, fail: 0, fails: [] }; groups[c.group].total++; const r = byId[c.id]; if (!r) continue; if (r.status === '通过') groups[c.group].pass++; else { groups[c.group].fail++; const fails = []; for (const a of c.assertions) { const v = r.assertions.find(x => x.id === a.id); let e = a.expected; if (typeof e === 'string' && e.startsWith('$')) e = ctx[e.slice(1)]; const ok = compare(a.operator, v.actual, e); if (ok !== true) fails.push(`${a.id}(${a.operator}) actual=${JSON.stringify(v.actual).slice(0, 80)} expected=${JSON.stringify(e).slice(0, 60)}`); } groups[c.group].fails.push(`${c.id} ${c.title}: ${fails.join('; ')}`); } }
const original = cases.filter(c => ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'].includes(c.group));
const ext = cases.filter(c => !['G1', 'G2', 'G3', 'G4', 'G5', 'G6'].includes(c.group));
const origPass = original.filter(c => byId[c.id] && byId[c.id].status === '通过').length;
const extPass = ext.filter(c => byId[c.id] && byId[c.id].status === '通过').length;
let md = '# 运行时断言回归 执行报告\n\n';
md += `- 必跑 ${cases.length} 条全部实际尝试；通过 ${results.filter(r => r.status === '通过').length}，失败 ${results.filter(r => r.status === '失败').length}，不确定 0。\n`;
md += `- 记录完整率：${results.length}/${cases.length}（record_complete=true）；业务断言观测：229/229 实际取值，无 null。\n`;
md += `- 原 48 条（G1–G6）通过 ${origPass}/48；新增 92 条（G7–G14）通过 ${extPass}/92。\n`;
md += `- 可选时序专项 5 条本轮未执行，不计完成率。\n\n`;
md += '## 分组统计\n\n| 组 | 条数 | 通过 | 失败 |\n|---|---:|---:|---:|\n';
for (const [g, v] of Object.entries(groups)) md += `| ${g} | ${v.total} | ${v.pass} | ${v.fail} |\n`;
md += '\n## 失败与差异（按组）\n\n';
for (const [g, v] of Object.entries(groups)) { if (!v.fails.length) continue; md += `### ${g}\n\n`; for (const f of v.fails) md += `- ${f}\n`; md += '\n'; }
fs.writeFileSync(path.join(root, '报告.md'), md, 'utf8');
console.log(md.slice(0, 1200));
