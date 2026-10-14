import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

// Mechanical evidence audit only. Business assertions and fresh recovery checks
// remain the caller's responsibility; historical hashes do not prove current UI.
export function auditTask(taskDirectory){
 const root=fs.realpathSync(path.resolve(taskDirectory)),issues=[],calls=[],events=[];
 const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 function evidence(relative){
  if(typeof relative!=='string'||path.isAbsolute(relative))throw Error('Evidence path must be relative');
  const resolved=fs.realpathSync(path.resolve(root,relative));
  if(!resolved.startsWith(root+path.sep))throw Error('Evidence path escapes task');return resolved;
 }
 function rows(relative,destination,required){
  try{const file=evidence(relative);for(const [index,line]of fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').split(/\r?\n/).entries()){if(!line.trim())continue;try{destination.push(JSON.parse(line));}catch{issues.push({kind:'invalidJSONL',file:relative,line:index+1});}}}catch(e){if(required)issues.push({kind:'missingLog',file:relative,error:e.message});}
 }
 rows('运行日志/业务调用.jsonl',calls,true);rows('运行日志/business.jsonl',events,false);
 const callIds=new Set(),eventIds=new Set();
 for(const e of events){if(!e.event_id)continue;if(eventIds.has(e.event_id))issues.push({kind:'duplicateEvent',eventId:e.event_id});eventIds.add(e.event_id);}
 const checkedFiles=new Map();let checkedReferences=0;
 function verify(relative,expected,callId,kind){try{if(!/^[a-fA-F0-9]{64}$/.test(expected||''))throw Error('Invalid SHA-256');const file=evidence(relative);let actual=checkedFiles.get(file);if(!actual){actual=hash(file);checkedFiles.set(file,actual);}if(actual!==expected.toLowerCase())issues.push({kind:'hashMismatch',file:relative,callId,reference:kind});checkedReferences++;}catch(e){issues.push({kind:'invalidEvidence',file:relative,callId,reference:kind,error:e.message});}}
 for(const c of calls){
  if(!['returned','error'].includes(c.status)||typeof c.function_name!=='string'||!c.function_name||typeof c.environment_id!=='string'||!c.environment_id)issues.push({kind:'invalidCallIdentity',callId:c.call_id});
  if(!Array.isArray(c.modules)||c.modules.length===0)issues.push({kind:'missingSourceSnapshots',callId:c.call_id});
  if(!c.call_id||callIds.has(c.call_id))issues.push({kind:'missingOrDuplicateCall',callId:c.call_id});callIds.add(c.call_id);
  verify(c.args_path,c.args_sha256,c.call_id,'arguments');verify(c.return_path,c.return_sha256,c.call_id,'return');
  for(const m of c.modules||[])verify(m.snapshot,m.sha256,c.call_id,'sourceSnapshot');
  try{const returned=JSON.parse(fs.readFileSync(evidence(c.return_path),'utf8'));if(returned.call_id!==c.call_id||returned.status!==c.status)issues.push({kind:'returnIdentityMismatch',callId:c.call_id});
   for(const key of ['evidence_ref','action_ref']){const id=returned.observations?.[key];if(id&&!events.some(e=>e.event_id===id&&e.business_call_id===c.call_id))issues.push({kind:'missingEventReference',callId:c.call_id,reference:key,eventId:id});}
  }catch(e){issues.push({kind:'invalidReturn',callId:c.call_id,error:e.message});}
 }
 const callReferences=calls.slice(0,3).map(c=>Object.fromEntries(['call_id','function_name','status','args_path','args_sha256','return_path','return_sha256'].map(k=>[k,c[k]])));
 return{taskRoot:root,calls:calls.length,events:events.length,uniqueFiles:checkedFiles.size,checkedReferences,statuses:calls.reduce((a,c)=>(a[c.status]=(a[c.status]||0)+1,a),{}),functions:[...new Set(calls.map(c=>c.function_name))],callIndex:'运行日志/业务调用.jsonl',callReferences,referencesTruncated:calls.length>3,issues,integrityVerified:calls.length>0&&issues.length===0,businessVerified:false,currentRecoveryVerified:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{if(process.argv.length!==3)throw Error('Usage: node maintenance/audit-task.mjs <taskDirectory>');const r=auditTask(process.argv[2]);console.log(JSON.stringify(r,null,2));process.exitCode=r.integrityVerified?0:1;}catch(e){console.error(JSON.stringify({error:e.message,businessVerified:false}));process.exitCode=1;}
}
