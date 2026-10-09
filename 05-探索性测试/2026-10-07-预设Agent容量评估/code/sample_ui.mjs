import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {invoke} from '../../../tools/ui-operations/call.mjs';
const taskRoot=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const environment=JSON.parse(fs.readFileSync(path.join(taskRoot,'环境记录.json'),'utf8'));
const dir=path.join(taskRoot,'负载采样');fs.mkdirSync(dir,{recursive:true});
for(let i=1;i<=10;i++){
 const marker=`PRESET_CAP_20261007_${String(i).padStart(2,'0')}`;
 if(fs.existsSync(path.join(dir,marker+'.json')))continue;
 const shared={};const started=Date.now();let calls=[];
 try{
  const a=await invoke('conversation.newTask',{forceNew:true},{taskRoot,environment,shared});calls.push(a);
  if(a.status!=='returned')throw Error(JSON.stringify(a.error));
  const text=`你是产品内置的标准工作Agent。本轮是虚构销售分析任务，标记${marker}。数据：1月收入1000成本700；2月收入2000成本1400；3月收入3000成本2100；4月收入4000成本2800；5月收入5000成本3500；6月收入6000成本4200。请先使用代码工作工具实际计算总收入、总成本、利润及利润率（只执行内存计算，不读写文件，不访问外网，不需要提问）。然后写一份约300字的业务分析，含一张逐月表格、趋势解读和两条建议。最后独立一行输出：${marker} TOTAL=21000 COST=14700 PROFIT=6300 MARGIN=30%。`;
  const b=await invoke('conversation.sendMessage',{text,timeoutMs:180000},{taskRoot,environment,shared});calls.push(b);
  fs.writeFileSync(path.join(dir,marker+'.json'),JSON.stringify({marker,preset:'standard',started_at:new Date(started).toISOString(),ended_at:new Date().toISOString(),prompt:text,calls},null,2));
  console.log(JSON.stringify({sample:i,marker,status:b.status,wait:b.observations?.observations?.wait,answer_tail:b.observations?.observations?.assistant?.value?.slice(-160)}));
  if(b.status!=='returned'||b.observations?.observations?.wait?.timed_out)break;
 }finally{await shared.connection?.close();}
}
