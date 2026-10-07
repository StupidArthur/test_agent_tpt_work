import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const commit='770dacd',source='探索性测试/2026-10-07-PC88-记忆测试与函数补齐/',root='探索性测试/2026-10-07-PC88分支审核/历史对照证据';fs.mkdirSync(root,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),ledger=[];
function copy(file){const b=execFileSync('git',['show',commit+':'+source+file]);const p=path.join(root,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b);ledger.push({commit,source_path:source+file,path:file,bytes:b.length,sha256:sha(b),source_kind:'Git commit bytes; not a new product run'});return b;}
for(let n=1;n<=18;n++)copy('结果/MEM-'+String(n).padStart(2,'0')+'.json');
for(const p of ['环境记录.json','报告.md','files4.out.json','files5.out.json','files6.out.json','运行日志/业务调用.jsonl'])copy(p);
const calls=fs.readFileSync(path.join(root,'运行日志/业务调用.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
for(const c of calls.filter(c=>['conversation.sendMessage','conversation.newTask','settings.setRowToggle','mem.restore'].includes(c.function_name))){copy(c.args_path);copy(c.return_path);}
const auto=calls.find(c=>c.call_id==='CALL-61ad0d58-1df9-4371-94d2-e7002c929f3b');
const args=JSON.parse(fs.readFileSync(path.join(root,auto.args_path),'utf8')),returned=JSON.parse(fs.readFileSync(path.join(root,auto.return_path),'utf8'));
const answer=returned.observations.observations.assistant.value;
const measurements={autoCall:auto.call_id,userCharacters:args.text.length,assistantCharacters:answer.length,sumCharacters:args.text.length+answer.length,gateUnitNotVerified:true,fileReads:['files4.out.json','files5.out.json','files6.out.json'].map(f=>{const o=JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),c=calls.find(c=>c.call_id===o.call_id);return {file:f,call_id:o.call_id,started_at:c?.started_at,ended_at:c?.ended_at};})};
fs.writeFileSync(path.join(root,'来源索引.json'),JSON.stringify(ledger,null,2));fs.writeFileSync(path.join(root,'时间与长度核对.json'),JSON.stringify(measurements,null,2));console.log(JSON.stringify({files:ledger.length,...measurements},null,2));
