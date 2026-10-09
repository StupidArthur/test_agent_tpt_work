import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {invoke} from '../../../tools/tpt-work/call.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),environment=JSON.parse(fs.readFileSync(path.join(root,'环境记录.json'),'utf8')),runtime={extension_run:process.argv[2]||'audit-link-20261007'},shared={};
async function call(name,args,save){const r=await invoke(name,args,{taskRoot:root,environment,runtime,shared});fs.writeFileSync(path.join(root,'现场读取',save+'.json'),JSON.stringify(r,null,2));console.log(JSON.stringify({name,status:r.status,call_id:r.call_id,error:r.error}));if(r.status==='error')throw Error(r.error.message);return r.observations.observations;}
let helper;try{helper=(await call('fixtures.startLinkServer',{run:runtime.extension_run},'links-start')).read.value;
await call('audit.linkControl',{url:helper.base_url+'/health',run:runtime.extension_run},'links-health');
for(const [key,value]of (process.argv[3]==='default-only'?[['default-browser','默认浏览器']]:[['sidebar','应用内侧边栏'],['default-browser','默认浏览器']])){
const url=helper.base_url+'/'+key;await call('settings.setSelect',{section:'常规',label:'网页链接默认打开方式',value},'links-setting-'+key);
await call('conversation.newTask',{projectPath:environment.project_path,forceNew:true},'links-new-'+key);
await call('conversation.sendMessage',{text:'请只输出一个 Markdown 链接：[验收链接]('+url+')，不要访问链接，也不要添加其他内容。',timeoutMs:90000},'links-reply-'+key);
await call('conversation.readLinkLog',{file:helper.log,mode:'paths'},'links-before-'+key);
await call('conversation.openLinkInReply',{hrefPart:url},'links-click-'+key);
await call('conversation.readSidePanelVisible',{},'links-panel-'+key);
await call('conversation.readLinkLog',{file:helper.log,mode:key==='sidebar'?'paths':'ua',hrefPart:'/'+key},'links-after-'+key);
}
}catch(e){console.log(JSON.stringify({error:e.message}));}finally{await call('settings.setSelect',{section:'常规',label:'网页链接默认打开方式',value:'应用内侧边栏'},'links-restored');if(helper)await call('fixtures.stopLinkServer',{state:helper.state},'links-stopped');await shared.connection?.close();}
