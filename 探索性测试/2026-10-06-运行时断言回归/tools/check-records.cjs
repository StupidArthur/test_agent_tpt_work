// Integrity gate; does not operate UI or approve product conclusions.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),compare=require('./compare.cjs');
const root=path.resolve(__dirname,'..'),parse=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const cases=parse(path.join(root,'用例/cases.json')),issues=[],counts={通过:0,失败:0,不确定:0,未执行:0},coverage={observed:0,unobserved:0,failed:0};
const context=fs.existsSync(path.join(root,'运行上下文.json'))?parse(path.join(root,'运行上下文.json')):{};
const env=fs.existsSync(path.join(root,'环境记录.json'))?parse(path.join(root,'环境记录.json')):null;
const events=new Map(),eventFiles=new Map(),caseIds=new Set(cases.map(c=>c.id));
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const relative=p=>path.relative(root,p).replaceAll('\\','/');
function safeFile(p){const absolute=path.resolve(root,p||'');return absolute.startsWith(root+path.sep)&&fs.existsSync(absolute)&&fs.statSync(absolute).isFile()?absolute:null;}
for(const f of fs.readdirSync(path.join(root,'运行日志'))){
 if(!f.endsWith('.jsonl'))continue;
 const p=path.join(root,'运行日志',f);
 for(const line of fs.readFileSync(p,'utf8').split(/\r?\n/).filter(Boolean))try{
  const e=JSON.parse(line);if(!e.event_id)continue;
  if(events.has(e.event_id))issues.push('duplicate event '+e.event_id);
  events.set(e.event_id,e);eventFiles.set(e.event_id,relative(p));
 }catch{issues.push('invalid log '+f);}
}
for(const f of fs.readdirSync(path.join(root,'结果')))if(f.endsWith('.json')&&!caseIds.has(f.slice(0,-5)))issues.push('unregistered result '+f);
for(const c of cases){
 const file=path.join(root,'结果',c.id+'.json');if(!fs.existsSync(file)){counts.未执行++;continue;}
 try{
  const r=parse(file),verdicts=[],used=new Set();
  if(r.case_id!==c.id||r.contract_version!==c.contract_version)issues.push(c.id+' case/contract identity');
  if(!r.attempt_id||r.environment_id!==env?.environment_id)issues.push(c.id+' attempt/environment identity');
  if(!iso(r.started_at)||!iso(r.ended_at)||Date.parse(r.started_at)>Date.parse(r.ended_at))issues.push(c.id+' execution times');
  if(!r.actual_steps?.length||!r.object_identity||!Array.isArray(r.inputs))issues.push(c.id+' missing steps/object/inputs');
  if(!r.action_refs?.length)issues.push(c.id+' missing action events');
  for(const id of r.action_refs||[]){used.add(id);const e=events.get(id);if(!e||e.kind!=='action'||e.environment_id!==r.environment_id||!iso(e.captured_at)||!e.target||!e.action)issues.push(c.id+' invalid action '+id);}
  if(!['restored','retained','failed','unchanged'].includes(r.cleanup?.status)||!r.cleanup?.description)issues.push(c.id+' cleanup record');
  for(const id of r.cleanup?.read_refs||[]){used.add(id);if(events.get(id)?.kind!=='read')issues.push(c.id+' invalid cleanup read');}
  if(c.assertions.length!==r.assertions?.length||new Set((r.assertions||[]).map(a=>a.id)).size!==r.assertions?.length)issues.push(c.id+' assertion count/duplicates');
  for(const a of c.assertions){
   const v=r.assertions?.find(x=>x.id===a.id);if(!v){issues.push(a.id+' missing assertion');verdicts.push(null);coverage.unobserved++;continue;}
   let expected=a.expected;
   if(typeof expected==='string'&&expected.startsWith('$')){expected=context[expected.slice(1)];if(expected===undefined)issues.push(a.id+' missing context binding');}
   if(v.actual===undefined){issues.push(a.id+' missing actual');verdicts.push(null);coverage.unobserved++;continue;}
   const verdict=expected===undefined?null:compare(a.operator,v.actual,expected);verdicts.push(verdict);if(verdict===false)coverage.failed++;
   if(v.actual===null){coverage.unobserved++;if(!v.reason||!v.failed_dependency)issues.push(a.id+' null needs reason/dependency');}else coverage.observed++;
   const reads=(v.read_refs||[]).map(id=>{used.add(id);return events.get(id);});
   if(!reads.length||reads.some(e=>!e||e.kind!=='read'||!e.target||!iso(e.captured_at))){issues.push(a.id+' missing valid reads');continue;}
   for(const e of reads){
    if(e.environment_id!==r.environment_id||!e.object_id)issues.push(a.id+' read identity');
    if(!['dom','file','http','derived'].includes(e.source?.channel)||!e.source?.scope||!e.source?.locator)issues.push(a.id+' read provenance');
    if((typeof e.value==='boolean'||e.source?.channel==='derived')&&(!Object.hasOwn(e,'raw')||!e.derivation))issues.push(a.id+' aggregate lacks raw/formula');
    for(const id of e.source?.event_refs||[]){used.add(id);if(!events.has(id))issues.push(a.id+' source event missing');}
   }
   if(v.actual===null)continue;
   if(['different','same_value','sha256_equal'].includes(a.operator)){
    if(reads.length!==2||JSON.stringify(v.actual.before)!==JSON.stringify(reads[0].value)||JSON.stringify(v.actual.after)!==JSON.stringify(reads[1].value))issues.push(a.id+' comparison differs from logs');
    if(a.operator!=='different'&&(reads[0].target!==reads[1].target||reads[0].object_id!==reads[1].object_id))issues.push(a.id+' wrong object compared');
    if(Date.parse(reads[0].captured_at)>Date.parse(reads[1].captured_at))issues.push(a.id+' reversed timestamps');
   }else if(JSON.stringify(v.actual)!==JSON.stringify(reads.at(-1).value))issues.push(a.id+' actual differs from log');
  }
  const status=verdicts.includes(false)?'失败':verdicts.includes(null)?'不确定':'通过';if(r.status!==status)issues.push(c.id+' status inconsistent; computed '+status);counts[status]++;
  const registered=new Set();if(!r.evidence?.length)issues.push(c.id+' missing evidence');
  for(const e of r.evidence||[]){const p=safeFile(e.path);if(!p){issues.push(c.id+' invalid evidence path');continue;}registered.add(relative(p));if(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==e.sha256)issues.push(c.id+' hash mismatch');}
  for(const id of used){const p=eventFiles.get(id);if(p&&!registered.has(p))issues.push(c.id+' log not indexed '+p);}
 }catch(e){issues.push(c.id+' '+e.message);}
}
if(cases.length!==counts.未执行){
 if(!env?.environment_id||!env?.cdp_endpoint||!env?.app_identity?.path||!/^[a-f0-9]{64}$/i.test(env?.app_identity?.sha256||'')||!env?.project||!iso(env?.captured_at))issues.push('missing environment/app/project baseline');
 if(!safeFile(env?.fixture_manifest))issues.push('missing fixture manifest');
 if(env?.queue_sha256!==crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'用例/cases.json'))).digest('hex'))issues.push('queue changed or initial hash missing');
 for(const c of cases)for(const a of c.assertions){if(typeof a.expected!=='string'||!a.expected.startsWith('$'))continue;const key=a.expected.slice(1);if(context[key]===undefined)continue;const s=context.binding_sources?.[key];
  if(s?.kind==='fixture'){if(!safeFile(s.path))issues.push(key+' fixture binding source');}
  else if(s?.kind==='read'){if(events.get(s.event_id)?.kind!=='read')issues.push(key+' initial read source');}
  else if(s?.kind==='chosen'){if(!s.reason||!iso(s.chosen_at))issues.push(key+' choice source');}
  else issues.push(key+' binding provenance missing');
 }
}
const unique=[...new Set(issues)],recordComplete=!counts.未执行&&!unique.length;
console.log(JSON.stringify({total:cases.length,assertions:cases.reduce((n,c)=>n+c.assertions.length,0),counts,assertion_coverage:coverage,
 record_complete:recordComplete,business_fully_observed:recordComplete&&!coverage.unobserved,complete:recordComplete,issues:unique,
 note:'记录完成与业务全观测分别统计；结构通过不代表真实操作或产品结论已审核'},null,2));
process.exitCode=unique.length?1:0;
