// 离线核对结构与证据引用。业务是否正确由实际记录及双方审核决定�?const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),repo=path.resolve(root,'../..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const core=read('用例/cases.json');
const extra=fs.existsSync(path.join(root,'用例/extra-cases.json'))?read('用例/extra-cases.json'):[];
const cases=core.concat(extra),manifest=read('用例/来源清单.json');
const statuses=['未执�?,'暂缓-未实�?,'暂缓-本轮不可�?,'阻塞','不适用','已执�?符合预期','已执�?存在差异','已执�?结论不确�?];
const issues=[],counts=Object.fromEntries(statuses.map(s=>[s,0])),byModule={};
const ids=new Set(cases.map(c=>c.id));
const indexed=new Map();
function evidencePaths(paths,label,owner) {
  if(!Array.isArray(paths)) {issues.push(label+': evidence需为数�?);return;}
  for(const p of paths) {
    if(typeof p!=='string') {issues.push(label+': 证据路径非字符串');continue;}
    const abs=path.resolve(root,p),inside=path.relative(root,abs);
    if(inside.startsWith('..')||path.isAbsolute(inside)||!p.startsWith('证据/')) {issues.push(label+': 证据必须在本任务证据目录: '+p);continue;}
    if(!fs.existsSync(abs)||!fs.statSync(abs).isFile()) {issues.push(label+': 证据文件缺失: '+p);continue;}
    const entry=indexed.get(p);
    if(!entry)issues.push(label+': 证据未入索引: '+p);
    else if(owner&&(entry.case_id!==owner.case_id||entry.attempt_id!==owner.attempt_id))issues.push(label+': 证据归属不匹�? '+p);
  }
}
const index=fs.readFileSync(path.join(root,'证据/索引.jsonl'),'utf8').split(/\r?\n/).filter(x=>x.trim());
index.forEach((line,n)=>{try{const e=JSON.parse(line);if(indexed.has(e.path))issues.push('证据索引路径重复: '+e.path);indexed.set(e.path,e);if(!ids.has(e.case_id))issues.push('证据关联未知case: '+e.case_id);if(!e.attempt_id||!e.captured_at||!e.proves||e.redacted!==true)issues.push('证据索引字段或脱敏状态缺�? '+(n+1));const abs=path.resolve(root,e.path||''),rel=path.relative(path.join(root,'证据'),abs);if(rel.startsWith('..')||path.isAbsolute(rel)||!fs.existsSync(abs)||!fs.statSync(abs).isFile())issues.push('证据路径无效: '+e.path);else if(hash(abs)!==e.sha256)issues.push('证据哈希不符: '+e.path);}catch(err){issues.push('证据索引�?+(n+1)+'行无�? '+err.message);}});
const attemptPairs=new Set();for(const name of fs.readdirSync(path.join(root,'\u6267\u884c\u8bb0\u5f55')).filter(x=>x.endsWith('.json'))){try{const r=JSON.parse(fs.readFileSync(path.join(root,'\u6267\u884c\u8bb0\u5f55',name),'utf8'));for(const a of r.attempts||[])attemptPairs.add(r.case_id+'\0'+a.attempt_id);}catch{}}
const observationMap=new Map(),observationFile=path.join(root,'\u89c2\u5bdf\u8bb0\u5f55.jsonl');if(fs.existsSync(observationFile))for(const [n,line] of fs.readFileSync(observationFile,'utf8').split(/\r?\n/).entries()){if(!line.trim())continue;try{const o=JSON.parse(line);if(!o.observation_id||observationMap.has(o.observation_id))issues.push('duplicate or missing observation id '+(n+1));else observationMap.set(o.observation_id,o);}catch(err){issues.push('invalid observation '+(n+1)+' '+err.message);}}
for(const [n,line] of index.entries()){try{const e=JSON.parse(line);if(attemptPairs.has(e.case_id+'\0'+e.attempt_id))continue;const o=observationMap.get(e.observation_id);if(!o||!o.related_cases?.includes(e.case_id)||o.legacy_attempt_id!==e.attempt_id)issues.push('unregistered attempt lacks matching historical observation '+(n+1));}catch{}}
if(core.length!==350||ids.size!==cases.length)issues.push('原用例总数不是350或补充编号重�?);
if(new Set(cases.map(c=>c.title)).size!==cases.length)issues.push('用例标题重复');
const sourceMap=new Map(manifest.source_documents.map(s=>[s.file,s]));
if(sourceMap.size!==31)issues.push('来源分篇数量不是31');
for(const s of sourceMap.values()) {const file=path.join(repo,'01-产品资料/原设计文�?TPT桌面端设计资�?,s.file);if(!fs.existsSync(file))issues.push('来源文件缺失: '+s.file);else if(hash(file)!==s.sha256)issues.push('来源已变化，需重新评审适用�? '+s.file);}
for(const c of cases) {
  if(!c.title||!c.preconditions.length||c.steps.length<3||!c.expected.length||!c.source.line||!c.source.quote||!c.basis)issues.push(c.id+': 用例字段不全');
  const source=sourceMap.get(c.source.file);if(!source||(c.module!=='EXTRA'&&!source.cases.includes(c.id)))issues.push(c.id+': 来源映射缺失');
  else {const lines=fs.readFileSync(path.join(repo,'01-产品资料/原设计文�?TPT桌面端设计资�?,c.source.file),'utf8').split(/\r?\n/);if(lines[c.source.line-1]?.trim()!==c.source.quote)issues.push(c.id+': 原文定位不一�?);}
  const file='执行记录/'+c.id+'.json';if(!fs.existsSync(path.join(root,file))){issues.push(c.id+': 缺逐条记录');continue;}
  let r;try{r=read(file);}catch(e){issues.push(c.id+': 结果JSON无效');continue;}
  if(r.case_id!==c.id||r.source_sha256!==source?.sha256)issues.push(c.id+': 结果身份或来源基线不�?);
  if(!statuses.includes(r.status)){issues.push(c.id+': 非法执行状�?);continue;}
  counts[r.status]++;byModule[c.module]??=Object.fromEntries(statuses.map(s=>[s,0]));byModule[c.module][r.status]++;
  if(r.status.startsWith('暂缓-') && (!r.task_scope?.reason || r.task_scope.confirmed_by!=='用户' || r.task_scope.status!==r.status)) issues.push(c.id+': 暂缓缺用户确认依�?);
  if(!Array.isArray(r.attempts)||!Array.isArray(r.product_observations)||!Array.isArray(r.differences)){issues.push(c.id+': attempts/observations/differences需为数�?);continue;}
  const attemptIds=new Set();for(const a of r.attempts){if(!a.attempt_id||attemptIds.has(a.attempt_id))issues.push(c.id+': 尝试ID缺失或重�?);attemptIds.add(a.attempt_id);if(!a.started_at||!a.ended_at||!a.environment_id||!a.surface||!a.observed_result||!Array.isArray(a.actual_steps)||!a.actual_steps.length)issues.push(c.id+': 尝试记录不完�?);evidencePaths(a.evidence,c.id+'/'+a.attempt_id,{case_id:c.id,attempt_id:a.attempt_id});}
  if(r.latest_attempt_id&&!attemptIds.has(r.latest_attempt_id))issues.push(c.id+': latest_attempt_id不存�?);
  const executed=r.status.startsWith('已执�?);
  if(executed){const a=r.attempts.find(x=>x.attempt_id===r.latest_attempt_id);if(!a)issues.push(c.id+': 已执行却没有最新尝�?);else {if(!a.evidence?.length)issues.push(c.id+': 已执行缺证据');const checks=a.checkpoints||[];if(checks.length!==c.expected.length||new Set(checks.map(x=>x.expected_index)).size!==c.expected.length)issues.push(c.id+': 未逐检查点记录');for(const cp of checks){if(cp.expected!==c.expected[cp.expected_index-1]||!cp.observed||!['符合','差异','未验�?].includes(cp.verdict))issues.push(c.id+': 检查点预期或观察缺�?);evidencePaths(cp.evidence,c.id+'/检查点'+cp.expected_index,{case_id:c.id,attempt_id:a.attempt_id});if(r.status==='已执�?符合预期'&&(cp.verdict!=='符合'||!cp.evidence?.length))issues.push(c.id+': 通过但检查点未验�?无证�?);}if(a.status!==r.status)issues.push(c.id+': 当前状态与最新尝试不�?);}if(!r.product_observations.length)issues.push(c.id+': 缺实际产品行为记�?);}
  if(r.status==='已执�?存在差异'&&!r.differences.length)issues.push(c.id+': 差异未登�?);
  if(r.status==='阻塞'){if(!r.blocker?.reason||!r.blocker?.missing_dependency||!r.blocker?.evidence?.length)issues.push(c.id+': 阻塞缺依赖、原因或证据');else evidencePaths(r.blocker.evidence,c.id+'/阻塞');}
  if(r.status==='不适用'){if(!r.applicability_reason?.reason||!r.applicability_reason?.evidence?.length)issues.push(c.id+': 不适用缺理由或证据');else evidencePaths(r.applicability_reason.evidence,c.id+'/不适用');}
}
const executed=Object.entries(counts).filter(([s])=>s.startsWith('已执�?)).reduce((n,[,v])=>n+v,0);
console.log(JSON.stringify({total:cases.length,original_cases:core.length,extra_cases:extra.length,executed,conforming:counts['已执�?符合预期'],status_counts:counts,by_module:byModule,evidence_files:indexed.size,all_executed:executed===cases.length,review:'统计不等于双方审核通过',issues},null,2));
process.exitCode=issues.length?1:0;
