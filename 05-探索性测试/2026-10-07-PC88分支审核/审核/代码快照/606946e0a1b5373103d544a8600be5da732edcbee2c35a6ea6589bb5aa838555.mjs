import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {invoke} from '../../../tools/ui-operations/call.mjs';
const taskRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const environment=JSON.parse(fs.readFileSync(path.join(taskRoot,'环境记录.json'),'utf8'));
const shared={},results=[];const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const root=fs.realpathSync(environment.memory_root),backups=[];
const initialNames=fs.readdirSync(root),initialAudit=fs.readFileSync(path.join(root,'audit.jsonl'));
const lock=path.resolve('tools/ui-operations/.ui.lock');fs.mkdirSync(lock);fs.writeFileSync(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid,taskRoot}));
async function call(name,args={}){const r=await invoke(name,args,{taskRoot,environment,shared});results.push({name,args,status:r.status,error:r.error,call_id:r.call_id});console.log(JSON.stringify(results.at(-1)));if(r.status!=='returned')throw Error(name+': '+r.error?.message);return r.observations.observations;}
let failure;
try{
 for(const file of ['MEMORY.md','index.json']){const o=await call('fixtures.backupFile',{path:path.join(root,file)});backups.push(o.read.value);}
 const scopes=await call('mem.inspectSurfaces');if(scopes.panel.value.text.includes('输出验收链接'))throw Error('Panel read includes sidebar');
 await call('mem.inspectSurfaces'); // Same shared CDP connection must remain usable.
 for(const action of ['tabs','rows','library','advanced'])await call('mem.probePanel',{action});
 await call('mem.probePanel',{action:'edit',index:3});
 const overview=await call('mem.readOverview');if(overview.advanced.value.rows.length!==14)throw Error('Expected 14 independent advanced rows');
 await call('mem.readFiles');
 for(const [name,args] of [['mem.probePanel',{action:'delete-first'}],['mem.readFiles',{files:['../outside.txt']}],['mem.editLayerFile',{file:'USER.md',content:'wrong',beforeSha256:'invalid'}]]){const r=await invoke(name,args,{taskRoot,environment,shared});results.push({name,args,status:r.status,error:r.error,expected:'error',call_id:r.call_id});if(r.status!=='error')throw Error('Invalid args were not rejected: '+name);}
 const marker='LOCAL_PC88_REVIEW_'+Date.now();const added=await call('mem.addEntry',{type:'事实',content:marker});if(added.after.value.matchingRows.length!==1||!fs.readFileSync(path.join(root,'MEMORY.md'),'utf8').includes(marker))throw Error('Entry was not added to one row and file');
 const before=fs.readFileSync(path.join(root,'MEMORY.md'));const content=before.toString('utf8').replace(marker,marker+'_EDITED');
 const edited=await call('mem.editLayerFile',{file:'MEMORY.md',beforeSha256:hash(before),content});if(!edited.after.value.matchesRequested)throw Error('Edited content differs from file');
}catch(e){failure={message:e.message,stack:e.stack};console.error(e.message);process.exitCode=1;}
finally{
 for(const b of backups){try{await call('fixtures.restoreFile',{path:b.path,backup:b.backup,sha256:b.sha256});}catch(e){failure={...failure,restore_error:e.message};process.exitCode=1;}}
 const generatedBackup=path.join(root,'MEMORY.md.bak');if(!initialNames.includes('MEMORY.md.bak')&&fs.existsSync(generatedBackup)){const bytes=fs.readFileSync(generatedBackup);results.push({name:'cleanup.reviewGeneratedBackup',path:generatedBackup,sha256:hash(bytes)});fs.unlinkSync(generatedBackup);}
 const restored=backups.map(b=>({path:b.path,expected:b.sha256,actual:hash(fs.readFileSync(b.path))}));
 if(restored.some(r=>r.actual!==r.expected)){failure={...failure,restore_mismatch:true};process.exitCode=1;}
 const audit=fs.readFileSync(path.join(root,'audit.jsonl'));
 await shared.connection?.close();fs.unlinkSync(path.join(lock,'owner.json'));fs.rmdirSync(lock);
 fs.writeFileSync(path.join(taskRoot,'修正版试用.json'),JSON.stringify({results,failure,restored,remainingNewFiles:fs.readdirSync(root).filter(n=>!initialNames.includes(n)),auditBeforeBytes:initialAudit.length,auditAfterBytes:audit.length,auditPrefixPreserved:audit.subarray(0,initialAudit.length).equals(initialAudit)},null,2));
}
