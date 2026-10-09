// Restored via apply_patch. Use UTF-8 file editing, never a shell text pipeline.
// Extend the independent validator with original source/checkpoint/scope checks.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),repo=path.resolve(root,'../..');
const n={cases:'\u7528\u4f8b',records:'\u6267\u884c\u8bb0\u5f55',sources:'\u6765\u6e90\u6e05\u5355.json',evidence:'\u8bc1\u636e',index:'\u7d22\u5f15.jsonl'};
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const core=read(n.cases+'/cases.json'),extra=read(n.cases+'/extra-cases.json'),cases=core.concat(extra);
const states=['\u672a\u6267\u884c','\u6682\u7f13-\u672a\u5b9e\u73b0','\u6682\u7f13-\u672c\u8f6e\u4e0d\u53ef\u6d4b','\u963b\u585e','\u4e0d\u9002\u7528','\u5df2\u6267\u884c-\u7b26\u5408\u9884\u671f','\u5df2\u6267\u884c-\u5b58\u5728\u5dee\u5f02','\u5df2\u6267\u884c-\u7ed3\u8bba\u4e0d\u786e\u5b9a'];
let base;const print=console.log;
try{console.log=v=>{base=JSON.parse(v);};require('./progress-safe.cjs');}finally{console.log=print;}
if(!base)throw new Error('Independent validator returned no statistics');
const issues=base.issues.slice(),warnings=[],byModule={};
if(core.length!==350||new Set(cases.map(c=>c.id)).size!==cases.length)issues.push('Core count or unique IDs invalid');
if(new Set(cases.map(c=>c.title)).size!==cases.length)issues.push('Duplicate case title');
const manifest=read(n.cases+'/'+n.sources),sources=new Map(manifest.source_documents.map(s=>[s.file,s]));
const sourceDir=path.join(repo,'01-\u4ea7\u54c1\u8d44\u6599/\u539f\u8bbe\u8ba1\u6587\u6863/TPT\u684c\u9762\u7aef\u8bbe\u8ba1\u8d44\u6599');
const lines=new Map();if(sources.size!==31)issues.push('Expected 31 source documents');
for(const s of sources.values()){const f=path.join(sourceDir,s.file);if(!fs.existsSync(f)){issues.push('Source missing: '+s.file);continue;}if(crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')!==s.sha256)issues.push('Source changed: '+s.file);lines.set(s.file,fs.readFileSync(f,'utf8').split(/\r?\n/));}
const index=fs.readFileSync(path.join(root,n.evidence,n.index),'utf8').split(/\r?\n/).filter(x=>x.trim()).map(JSON.parse),indexed=new Map(index.map(e=>[e.path,e]));
const ids=new Set(cases.map(c=>c.id));for(const e of index){if(!ids.has(e.case_id)||!e.attempt_id||!e.captured_at||!e.proves||e.redacted!==true)issues.push('Incomplete/unknown evidence metadata: '+e.path);}
function evidence(paths,label){if(!Array.isArray(paths)){issues.push(label+': evidence must be array');return;}for(const p of paths)if(!indexed.has(p))issues.push(label+': evidence not indexed: '+p);}
for(const c of cases){
 const s=sources.get(c.source.file);
 if(!s||(c.module!=='EXTRA'&&!s.cases.includes(c.id)))issues.push(c.id+': source mapping missing');
 if(lines.get(c.source.file)?.[c.source.line-1]?.trim()!==c.source.quote)issues.push(c.id+': source quote mismatch');
 if(!c.title||!c.preconditions?.length||c.steps?.length<3||!c.expected?.length||!c.basis)issues.push(c.id+': incomplete case');
 const r=read(n.records+'/'+c.id+'.json');
 if(r.case_id!==c.id||r.source_sha256!==s?.sha256)issues.push(c.id+': record/source identity mismatch');
 if(!states.includes(r.status))issues.push(c.id+': unknown status');
 byModule[c.module]??=Object.fromEntries(states.map(s=>[s,0]));byModule[c.module][r.status]=(byModule[c.module][r.status]||0)+1;
 if(r.status.startsWith('\u6682\u7f13-')&&(!r.task_scope?.reason||r.task_scope.confirmed_by!=='\u7528\u6237'||r.task_scope.status!==r.status))issues.push(c.id+': deferred without user scope');
 if(!Array.isArray(r.attempts)||!Array.isArray(r.product_observations)||!Array.isArray(r.differences)){issues.push(c.id+': invalid record arrays');continue;}
 const seen=new Set();for(const a of r.attempts){if(!a.attempt_id||seen.has(a.attempt_id))issues.push(c.id+': missing/duplicate attempt');seen.add(a.attempt_id);if(!a.started_at||!a.ended_at||!a.environment_id||!a.surface||!a.observed_result||!a.actual_steps?.length)issues.push(c.id+': incomplete attempt '+a.attempt_id);}
 if(r.latest_attempt_id&&!seen.has(r.latest_attempt_id))issues.push(c.id+': latest attempt missing');
 if(r.status.startsWith('\u5df2\u6267\u884c')){
  const a=r.attempts.find(a=>a.attempt_id===r.latest_attempt_id);
  if(!a){issues.push(c.id+': executed without latest attempt');continue;}
  if(a.status!==r.status||!a.evidence?.length)issues.push(c.id+': latest status/evidence incomplete');
  const checks=a.checkpoints||[];if(checks.length!==c.expected.length||new Set(checks.map(q=>q.expected_index)).size!==c.expected.length)issues.push(c.id+': checkpoint count invalid');
  for(const q of checks){if(q.expected!==c.expected[q.expected_index-1]||!q.observed||!['\u7b26\u5408','\u5dee\u5f02','\u672a\u9a8c\u8bc1'].includes(q.verdict))issues.push(c.id+': invalid checkpoint '+q.expected_index);if(r.status===states[5]&&(q.verdict!=='\u7b26\u5408'||!q.evidence?.length))issues.push(c.id+': conforming case has unverified checkpoint');if(q.verdict==='\u7b26\u5408'&&/^\u672a\u9a8c\u8bc1(?:[。．.：:]|$)/.test(q.observed))warnings.push(c.id+': observation contradicts verdict');}
  if(!r.product_observations.length)issues.push(c.id+': product observations missing');
 }
 if(r.status===states[6]&&!r.differences.length)issues.push(c.id+': difference not registered');
 if(r.status===states[3]){if(!r.blocker?.reason||!r.blocker?.missing_dependency||!r.blocker?.evidence?.length)issues.push(c.id+': blocker incomplete');else evidence(r.blocker.evidence,c.id+'/blocker');if(/^\u540c\u4e0a/.test(r.blocker?.missing_dependency||''))warnings.push(c.id+': blocker not self-contained');}
 if(r.status===states[4]){if(!r.applicability_reason?.reason||!r.applicability_reason?.evidence?.length)issues.push(c.id+': applicability incomplete');else evidence(r.applicability_reason.evidence,c.id+'/applicability');}
}
console.log(JSON.stringify({total:cases.length,original_cases:core.length,extra_cases:extra.length,executed:base.executed,conforming:base.counts[states[5]]||0,status_counts:base.counts,by_module:byModule,evidence_files:base.index_rows,registered_attempt_pairs:base.registered_attempt_pairs,observation_records:base.observations,legacy_observation_rows:base.orphan_rows,all_executed:base.executed===cases.length,review:'Structural checks do not approve product conclusions',review_warnings:warnings,issues},null,2));
process.exitCode=issues.length?1:0;
