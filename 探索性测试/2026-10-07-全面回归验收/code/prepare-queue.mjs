import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),rows=JSON.parse(fs.readFileSync(path.join(root,'逐条审查包.json'),'utf8')),q=[];
const add=(name,args,save)=>q.push({name,args,save});
add('experts.readDetail',{displayName:'本轮扩展专家-longread',internalName:'fast-assert-expert-longread-agent-oc-20261006-funcfull-01',endMarker:'FAST_PROMPT_END'},'longread-detail');add('experts.scrollPromptToEnd',{displayName:'本轮扩展专家-longread',internalName:'fast-assert-expert-longread-agent-oc-20261006-funcfull-01',endMarker:'FAST_PROMPT_END'},'longread-scroll');
for(const id of ['G5-08','G9-12','G13-06']){const r=rows.find(x=>x.case.id===id);for(const [i,c]of r.calls.entries())add(c.call.function_name,c.arguments,id+'-'+i);}
add('conversation.newTask',{projectPath:'D:/code/tpt-workspace',forceNew:true},'attachment-new');
add('conversation.openSearchShortcut',{},'shortcut-newtask');
for(const id of ['G7-02','G7-03','G7-11']){add('audit.clearAttachments',{},id+'-clear-before');const r=rows.find(x=>x.case.id===id);for(const[i,c]of r.calls.entries())add(c.call.function_name,c.arguments,id+'-'+i);}
add('audit.clearAttachments',{},'attachments-cleared');add('conversation.readComposerMenu',{trigger:'@',wantPattern:'文件|资料|本地'},'at-menu');add('conversation.clearDraft',{},'draft-cleared');
fs.writeFileSync(path.join(root,'code/queue.json'),JSON.stringify(q,null,2));
