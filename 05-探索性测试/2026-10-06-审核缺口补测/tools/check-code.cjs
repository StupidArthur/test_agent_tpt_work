// Check saved code versions and business-call provenance; no UI operations.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),issues=[],calls=new Map();
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const resolve=p=>{if(typeof p!=='string')return null;const result=path.resolve(root,p);return result.startsWith(root+path.sep)&&fs.existsSync(result)&&fs.statSync(result).isFile()?result:null;};
const callLog=path.join(root,'运行日志/业务调用.jsonl');
if(fs.existsSync(callLog))for(const line of fs.readFileSync(callLog,'utf8').split(/\r?\n/).filter(Boolean))try{
 const c=JSON.parse(line);if(calls.has(c.call_id))issues.push('duplicate business call '+c.call_id);calls.set(c.call_id,c);
 if(!c.call_id||!c.function_name||!c.function_version||!c.environment_id||!Number.isFinite(Date.parse(c.started_at))||!Number.isFinite(Date.parse(c.ended_at)))issues.push('incomplete business call '+c.call_id);
 if(!c.modules?.length)issues.push('missing module versions '+c.call_id);
 for(const module of c.modules||[]){const snapshot=resolve(module.snapshot);if(!snapshot||hash(snapshot)!==module.sha256)issues.push('snapshot hash '+c.call_id+' '+module.path);if(module.sha256!==module.sha256_after)issues.push('code changed during call '+c.call_id+' '+module.path);}
 const args=resolve(c.args_path);if(!args||hash(args)!==c.args_sha256)issues.push('argument file missing/changed '+c.call_id);
 const returned=resolve(c.return_path);if(!returned||hash(returned)!==c.return_sha256)issues.push('return value missing/changed '+c.call_id);
}catch{issues.push('invalid business call log');}
const events=new Map(),eventFiles=new Map();
for(const file of fs.readdirSync(path.join(root,'运行日志'))){if(!file.endsWith('.jsonl'))continue;for(const line of fs.readFileSync(path.join(root,'运行日志',file),'utf8').split(/\r?\n/).filter(Boolean))try{const e=JSON.parse(line);if(e.event_id){events.set(e.event_id,e);eventFiles.set(e.event_id,'运行日志/'+file);}}catch{}}
let results=0;
for(const file of fs.readdirSync(path.join(root,'结果'))){if(!file.endsWith('.json'))continue;results++;try{
 const r=JSON.parse(fs.readFileSync(path.join(root,'结果',file),'utf8'));
 if(!r.business_call_refs?.length)issues.push(r.case_id+' missing business-call references');
 const ids=new Set(r.business_call_refs||[]),indexed=new Set((r.evidence||[]).map(e=>e.path));
 if(!indexed.has('运行日志/业务调用.jsonl'))issues.push(r.case_id+' business call log not indexed');
 for(const id of ids){const call=calls.get(id);if(!call||call.environment_id!==r.environment_id)issues.push(r.case_id+' invalid business call '+id);}
 const refs=[...(r.action_refs||[]),...(r.assertions||[]).flatMap(a=>a.read_refs||[]),...(r.cleanup?.read_refs||[])];
 for(const id of refs){const event=events.get(id);if(!event)continue;
  // UI/derived-from-UI observations come from functions; offline file/fixture reads may be independent.
  if(event.kind==='action'||event.source?.channel==='dom')if(!event.business_call_id||!ids.has(event.business_call_id))issues.push(r.case_id+' UI event not linked to a business call '+id);
 }
}catch(error){issues.push(file+' '+error.message);}}
if(calls.size)fs.writeFileSync(path.join(root,'审核/脚本索引.json'),JSON.stringify([...calls.values()].map(c=>({call_id:c.call_id,function_name:c.function_name,function_version:c.function_version,environment_id:c.environment_id,started_at:c.started_at,ended_at:c.ended_at,status:c.status,args_path:c.args_path,args_sha256:c.args_sha256,return_path:c.return_path,return_sha256:c.return_sha256,modules:c.modules})),null,2)+'\n');
console.log(JSON.stringify({results,business_calls:calls.size,issues:[...new Set(issues)],note:'代码版本与调用关联校验；函数实现和业务断言仍需审核'},null,2));
if(issues.length)process.exitCode=1;
