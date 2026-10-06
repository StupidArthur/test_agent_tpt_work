const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const task=path.resolve(__dirname,'../../2026-10-06-审核缺口补测'),base=path.resolve(__dirname,'../../2026-10-06-业务函数复用回归');
if(fs.readdirSync(path.join(task,'结果')).length)throw Error('已经执行，不能调整任务');
const read=p=>JSON.parse(fs.readFileSync(path.join(task,p),'utf8')),write=(p,v)=>fs.writeFileSync(path.join(task,p),JSON.stringify(v,null,2)+'\n');
const cases=read('用例/cases.json'),c=cases.find(c=>c.id==='G12-02'),a=c.assertions.find(a=>a.id==='G12-02-A2');
a.read='限定本轮任务真正性能页脚，读取简洁档基本用量或速度字段，如tok/s或百分比；至少一个对应字段可见为true。保存具体字段原文；不扫描全页CSS或旧消息。A1另检查详细字段隐藏，tok/s不当作总token字段。';
for(const c of cases)for(const a of c.assertions)a.read=a.read.replaceAll('。。','。');
write('用例/cases.json',cases);
const changes=read('审核/判据变更.json'),x=changes.find(x=>x.assertion_id==='G12-02-A2');x.after=structuredClone(a);x.reason='排除tok/s与tok子串冲突；A1验证详细字段隐藏，A2验证基本用量显示';write('审核/判据变更.json',changes);
for(const rel of ['tools/check-records.cjs','tools/check-code.cjs','tools/progress.cjs','tools/call-business.mjs'])fs.copyFileSync(path.join(base,rel),path.join(task,rel));
write('code/business/catalog.json',{schema_version:'1.0',functions:[],note:'先查本轮catalog，缺能力再补business/automation；旧脚本只作参考，不是已审核函数'});
const oldDoc=fs.readFileSync(path.join(task,'扩展场景与夹具.md'),'utf8');
fs.writeFileSync(path.join(task,'扩展场景与夹具.md'),'# 本轮夹具准备\n\n本任务只跑README列出的59条。下文沿用夹具准备说明，历史140条全量队列与耗时建议不是本轮执行要求。场景顺序以本任务场景安排.md为准。\n\n'+oldDoc.slice(oldDoc.indexOf('## 样本准备')));
// 如果旧文档没有这个标题，保留正文但去掉旧队列介绍。
if(!oldDoc.includes('## 样本准备'))fs.writeFileSync(path.join(task,'扩展场景与夹具.md'),'# 本轮夹具准备\n\n只执行本任务59条，队列和场景以README及场景安排.md为准。\n\n'+oldDoc.slice(oldDoc.indexOf('## ')));
const mapping=read('来源与合并映射.json');mapping.queue_sha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(task,'用例/cases.json'))).digest('hex');write('来源与合并映射.json',mapping);
const md=['# 补测清单','','每条的完整比较规则在[用例/cases.json](用例/cases.json)。以下步骤是本次执行步骤，旧轮代码不是执行依据。',''];for(const c of cases){md.push(`## ${c.id} ${c.title}`,'',`原问题：${c.retest_reason}`,'',...c.steps.map((s,i)=>`${i+1}. ${s}。`),'',...c.assertions.map(a=>`- ${a.id}：${a.target}。读取：${a.read} 比较：${a.operator}；预期：${JSON.stringify(a.expected)}。`),'');}fs.writeFileSync(path.join(task,'补测清单.md'),md.join('\n'));
console.log('59条任务准备已完成；没有执行UI。');
