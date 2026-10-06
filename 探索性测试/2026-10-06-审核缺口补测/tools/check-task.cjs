const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const cases=read('用例/cases.json'),map=read('来源与合并映射.json'),status=read('任务状态.json'),issues=[];
const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'用例/cases.json'))).digest('hex');
if(hash!==map.queue_sha256)issues.push('执行队列已被修改');
const ids=new Set(cases.map(c=>c.id));if(ids.size!==59||cases.length!==59||status.case_count!==59)issues.push('必跑队列不是59条唯一case');
if(map.retained.length!==81||map.retained.some(c=>ids.has(c.case_id))||new Set([...ids,...map.retained.map(c=>c.case_id)]).size!==140)issues.push('原140条合并映射不完整或重复');
if(cases.reduce((n,c)=>n+c.assertions.length,0)!==108)issues.push('断言数量不一致');
for(const c of cases){if(!c.steps.length||!c.retest_reason||c.source_case_id!==c.id||c.contract_version!=='retest-1.0')issues.push(c.id+'缺步骤/来源');for(const a of c.assertions)if(!a.target||!a.read||!['equals','contains','greater_than','different','same_value','sha256_equal'].includes(a.operator))issues.push(a.id+'缺判据');}
for(const s of map.sources){const p=path.resolve(root,'..',s.task,s.path);if(!fs.existsSync(p)||crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==s.sha256)issues.push('来源变化 '+s.task+'/'+s.path);}
console.log(JSON.stringify({case_count:cases.length,assertion_count:108,retained:map.retained.length,total_merge_cases:140,results_present:fs.readdirSync(path.join(root,'结果')).filter(n=>n.endsWith('.json')).length,issues},null,2));if(issues.length)process.exitCode=1;
