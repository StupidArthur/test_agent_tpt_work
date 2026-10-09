import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {invoke} from '../../../tools/tpt-work/call.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),environment=JSON.parse(fs.readFileSync(path.join(root,'环境记录.json'),'utf8')),runtime={extension_run:'audit-edit-20261007'},shared={};
async function call(name,args,save){const r=await invoke(name,args,{taskRoot:root,environment,runtime,shared});fs.writeFileSync(path.join(root,'现场读取',save+'.json'),JSON.stringify(r,null,2));console.log(JSON.stringify({name,status:r.status,call_id:r.call_id,error:r.error}));if(r.status==='error')throw Error(r.error.message);return r.observations.observations;}
const internalName='fast-assert-expert-longread-agent-oc-20261006-funcfull-01',displayName='本轮扩展专家-longread',base=environment.agents_root+'/'+internalName,backups=[];let permission;
try{for(const n of ['agent.md','metadata.json'])backups.push((await call('fixtures.backupFile',{path:base+'/'+n},'expert-backup-'+n)).read.value);
await call('audit.closeFrameDialogs',{},'expert-preclose');await call('experts.startEdit',{displayName,internalName},'expert-edit-start');
permission=(await call('conversation.readTaskPermissionOptions',{},'expert-permissions')).before.value;
await call('conversation.setTaskPermission',{value:'完全权限'},'expert-permission-full');
await call('experts.editSend',{text:'请只为这个本轮测试专家提出修改方案：将 metadata.json 的 displayDescription.zh 改为 AUDIT_EXPERT_EDIT_20261007，其他字段、agent.md 和其他文件不变。先展示方案，不要写入，等我确认。',timeoutMs:90000,internalName},'expert-proposal');
await call('experts.readInstalledFileHashes',{paths:backups.map(b=>b.path)},'expert-preconfirm-hashes');
await call('experts.editSend',{text:'确认上述方案：仅保存本轮测试专家 '+internalName+' 的 metadata.json 中 displayDescription.zh 为 AUDIT_EXPERT_EDIT_20261007。不得修改其他字段或其他文件。',timeoutMs:90000,internalName},'expert-confirm');
await call('experts.readMetadataField',{path:base+'/metadata.json',field:'displayDescription.zh'},'expert-written-field');
await call('conversation.readToolTrace',{},'expert-edit-trace');
}catch(e){console.log(JSON.stringify({error:e.message}));}finally{try{if(permission)await call('conversation.setTaskPermission',{value:permission},'expert-permission-restored');for(const b of backups)await call('fixtures.restoreFile',{path:b.path,backup:b.backup,sha256:b.sha256},'expert-restored-'+path.basename(b.path));}finally{await shared.connection?.close();}}
