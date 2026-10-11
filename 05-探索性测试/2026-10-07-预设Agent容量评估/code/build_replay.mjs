import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const task=path.dirname(path.dirname(fileURLToPath(import.meta.url))),src=fs.readFileSync(path.join(task,'适配器快照/index.js'),'utf8');
const fragment=src.slice(src.indexOf('function serializeAssistantItems('),src.indexOf('//#endregion',src.indexOf('function serializeAssistantItems(')));
const sandbox={};vm.runInNewContext(fragment,sandbox);
const dir=path.join(task,'负载采样');let loads=[];
for(const name of fs.readdirSync(dir).filter(n=>/^PRESET_CAP_.*\d\d$/.test(n))){
 const rows=fs.readFileSync(path.join(dir,name,'session.jsonl'),'utf8').split('\n').filter(Boolean).map(s=>JSON.parse(s));
 const header=rows.find(x=>x.type==='request/header').data.header;
 const first=rows.findIndex(x=>x.type==='assistant/message');
 const messages=rows.slice(0,first).filter(x=>['system/message','user/message'].includes(x.type)).map(x=>x.data.message||x.data);
 const body=sandbox.serializeRequest({...header.config,messages,tools:header.tools},{},new Map(),header.config.reasoningEffort);
 const call=rows.find(x=>x.type==='tool/call'),result=rows.find(x=>x.type==='tool/result');
 const last=rows.filter(x=>x.type==='assistant/message').at(-1);
 const end=rows.find(x=>x.type==='turn/end');
 const final=last?.data.message.content.filter(x=>x.type==='text').map(x=>x.text).join('')||'';
 if(end?.data.reason.kind!=='completed'||!final.includes(name)||call?.data.name!=='pwsh'||!result)throw Error('Sample not matching declared load '+name);
 loads.push({marker:name,preset:rows[0].agentPreset,session:rows[0].id,cwd:rows[0].cwd,body,
  recorded_tool_name:call.data.name,recorded_tool_arguments:call.data.arguments,
  tool_result:result.data.message.content.filter(x=>x.type==='text').map(x=>x.text).join('\n'),
  tool_delay_s:Math.max(0,(result.time-call.time)/1000),
  model_calls:rows.filter(x=>x.type==='assistant/message').length,
  usage:rows.filter(x=>x.type==='assistant/message').map(x=>x.data.usage),
  source_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,name,'session.jsonl'))).digest('hex')});
}
fs.writeFileSync(path.join(task,'负载回放.json'),JSON.stringify({serializer_source_sha256:crypto.createHash('sha256').update(src).digest('hex'),serializer_fragment_sha256:crypto.createHash('sha256').update(fragment).digest('hex'),loads,method:'当前安装包serializer+本轮session重建；非直接抓包。第二次输入使用本次实际工具调用，工具本身不执行命令，回填独立验证的销售计算夹具并保留实测等待。'},null,2));
console.log(JSON.stringify({samples:loads.length,calls:loads.map(x=>x.model_calls),input_tokens:loads.map(x=>x.usage.map(u=>u.inputTokens)),tool_delays:loads.map(x=>x.tool_delay_s)}));
