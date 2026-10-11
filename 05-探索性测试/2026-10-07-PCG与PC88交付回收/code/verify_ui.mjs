import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {invoke} from '../../../tools/ui-operations/call.mjs';
const taskRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const environment=JSON.parse(fs.readFileSync(path.join(taskRoot,'环境记录.json')));const shared={};const results=[];
async function call(name,args={}){const r=await invoke(name,args,{taskRoot,environment,shared});results.push(r);console.log(JSON.stringify({name,call_id:r.call_id,status:r.status,error:r.error}));if(r.status!=='returned')throw Error(name+':'+r.error.message);return r.observations.observations;}
let plugin;
try{
 const before=await call('conversation.readComposer');
 const cards=await call('settings.listPluginCards');
 plugin=cards.read.value[0];
 if(!plugin)throw Error('No readable plugin cards');
 const label=plugin.text.split(/\r?\n/)[0].trim();const initial=plugin.expanded==='true';plugin={label,initial};
 const changed=await call('settings.setPluginExpanded',{label,expanded:!initial});
 if(changed.after.value!==!initial)throw Error('Expansion value differs');
 const restored=await call('settings.setPluginExpanded',{label,expanded:initial});
 if(restored.after.value!==initial)throw Error('Expansion restore differs');
 plugin=null;
 await call('settings.closeSettings');
 const search=await call('conversation.searchSessions',{query:'销售数据分析与利润计算'});
 if(!(search.read.value>0))throw Error('Known title not found; not a product conclusion');
 await call('conversation.readComposer');
}catch(error){results.push({review_error:error.message});}
finally{
 if(plugin?.label)try{await call('settings.setPluginExpanded',{label:plugin.label,expanded:plugin.initial});}catch(e){results.push({restore_error:e.message});}
 try{await call('settings.closeSettings');}catch(e){results.push({close_error:e.message});}
 await shared.connection?.close();
 fs.writeFileSync(path.join(taskRoot,'审核/UI本机试用-'+Date.now()+'.json'),JSON.stringify(results,null,2));
}
