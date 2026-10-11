import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {invoke} from '../../../tools/ui-operations/call.mjs';
const taskRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const environment=JSON.parse(fs.readFileSync(path.join(taskRoot,'环境记录.json'),'utf8'));
const shared={};
try {
 for(const [name,args] of [['application.inspectConnection',{}],['mem.readFiles',{}],['mem.inspectSurfaces',{}],['mem.probePanel',{action:'tabs'}],['mem.probePanel',{action:'rows'}],['mem.readOverview',{}],['mem.setAdvanced',{label:'不存在的审核参数',value:1}]]) {
  const r=await invoke(name,args,{taskRoot,environment,shared});
  fs.mkdirSync(path.join(taskRoot,'原版试用'),{recursive:true});
  fs.writeFileSync(path.join(taskRoot,'原版试用',name.replaceAll('.','-')+(args.action?'-'+args.action:'')+'.json'),JSON.stringify(r,null,2));
  console.log(JSON.stringify({name,args,status:r.status,error:r.error,call_id:r.call_id}));
 }
} finally {await shared.connection?.close();}
