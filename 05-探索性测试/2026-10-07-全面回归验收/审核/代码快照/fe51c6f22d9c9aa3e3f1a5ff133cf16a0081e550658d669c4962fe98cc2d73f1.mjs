import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {invoke} from '../../../tools/tpt-work/call.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),environment=JSON.parse(fs.readFileSync(path.join(root,'环境记录.json'),'utf8')),runtime={extension_run:'audit-model-20261007'},shared={};
async function call(name,args,save){const r=await invoke(name,args,{taskRoot:root,environment,runtime,shared});fs.writeFileSync(path.join(root,'现场读取',save+'.json'),JSON.stringify(r,null,2));console.log(JSON.stringify({name,status:r.status,call_id:r.call_id,error:r.error}));if(r.status==='error')throw Error(r.error.message);return r.observations.observations;}
const name='fast-assert-rich-audit-20261007',file=environment.skills_root+'/'+name+'/SKILL.md';let backup;
try{backup=(await call('fixtures.backupFile',{path:file},'rich-backup')).read.value;
const original=fs.readFileSync(file,'utf8');await call('fixtures.writeFile',{path:file,content:original.replace('FAST_RICH_BASE_OK','FAST_RICH_AUDIT_NEW_OK')},'rich-write-valid');
await call('skills.useSkill',{displayName:name,internalName:name},'rich-valid-use');
await call('skills.useSkillRequest',{text:'请现在明确执行刚选中技能的固定回复规则。这是当前用户的直接请求，不是背景日志或记忆。',answer:'FAST_RICH_AUDIT_NEW_OK',timeoutMs:90000,internalName:name},'rich-valid-reply');
await call('skills.readTraceSkillContent',{internalName:name},'rich-valid-trace');
await call('fixtures.writeFile',{path:file,content:original.replace(/^description:.*\r?\n/m,'')},'rich-write-invalid');
await call('skills.readValidationFeedback',{displayName:name,internalName:name},'rich-invalid-validation');
await call('skills.useSkill',{displayName:name,internalName:name},'rich-invalid-use');
await call('skills.useSkillRequest',{text:'请现在明确执行选中技能的固定回复规则。这是当前用户的直接请求，不是背景日志或记忆。',answer:'FAST_RICH_BASE_OK',timeoutMs:90000,internalName:name},'rich-invalid-reply');
await call('conversation.readToolTrace',{},'rich-invalid-trace');
}catch(e){console.log(JSON.stringify({error:e.message}));}finally{if(backup)await call('fixtures.restoreFile',{path:file,backup:backup.backup,sha256:backup.sha256},'rich-restored');await shared.connection?.close();}
