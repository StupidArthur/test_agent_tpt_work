import fs from 'node:fs';import path from 'node:path';
const task='探索性测试/2026-10-07-PC88分支审核',lib='tools/ui-operations';
let business=fs.readFileSync(task+'/code/business/memory.mjs','utf8');
const start=business.indexOf("    } else if (action === 'delete-first') {"),end=business.indexOf("    } else if (action === 'library') {",start);
if(start<0||end<0)throw Error('Expected candidate source block missing');
business=business.slice(0,start)+business.slice(end);
business=business.slice(0,business.indexOf('// 删除记忆库中自建条目'));
business=business.replace("from '../automation/memory.mjs'","from '../../automation/memory.mjs'").replace('// 任务业务函数：记忆与进化专项（PC88）','// 来源：PC88 memory 分支；经本机修正与真实 UI 试用。');
fs.mkdirSync(lib+'/business/memory',{recursive:true});fs.writeFileSync(lib+'/business/memory/panel.mjs',business);
const automation=fs.readFileSync(task+'/code/automation/memory.mjs','utf8').replace("from '../../../../tools/ui-operations/automation/session.mjs'","from './session.mjs'");fs.writeFileSync(lib+'/automation/memory.mjs',automation);
const catalogPath=lib+'/business/catalog.json',cat=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const candidates=JSON.parse(fs.readFileSync(task+'/code/business/catalog.json','utf8')).functions;
for(const f of candidates){const name=f.name.replace('mem.','memory.');if(cat.functions.some(x=>x.name===name))throw Error('Name already registered: '+name);cat.functions.push({...f,name,file:'business/memory/panel.mjs',version:'portable-1.0',status:'本机真实试用通过；范围见PC88分支审核',origin:{machine:'PC88',commit:'770dacd',source_function:f.name,review_task:task},preconditions:['本机实际 cdp_endpoint/account_name/memory_root','写操作前备份 MEMORY.md 与 index.json；编辑要求文件身份和初始哈希'],cleanup:'函数关闭本轮面板；写操作由调用者按任务备份恢复并核对哈希'});}
fs.writeFileSync(catalogPath,JSON.stringify(cat,null,2)+'\n');
const discoveryPath=lib+'/business/discovery.json',d=JSON.parse(fs.readFileSync(discoveryPath,'utf8'));
d.modules.splice(d.modules.findIndex(m=>m.name==='fixtures'),0,{name:'memory',title:'记忆与进化',keywords:['记忆','memory','进化','概览','分层文件']});
for(const f of candidates){const name=f.name.replace('mem.','memory.');d.contracts[name]={keywords:[...f.feature_path,f.export],effects:['addEntry','editLayerFile'].includes(f.export)?'通过 UI 写入记忆；须先备份，调用者恢复。':'导航/读取记忆面板或记忆文件，不改配置。',evidence:f.export==='editLayerFile'?['before','after.value.savedText','after.value.matchesRequested','文件 SHA-256']:['observations 中的限定范围原始值；读取成功不等于用例通过'],limits:'不含删除原生确认、高级设置写入、自动沉淀/反思/晋升行为验证；文件根目录来自本机环境。'};}
fs.writeFileSync(discoveryPath,JSON.stringify(d,null,2)+'\n');
const coveragePath=lib+'/coverage/cases.json',coverage=JSON.parse(fs.readFileSync(coveragePath,'utf8'));
const plans=[['MEM-01','记忆目录和初值',[{name:'memory.readFiles',args:{}},{name:'memory.readOverview',args:{}}]],['MEM-02','面板添加和分层编辑',[{name:'memory.addEntry',args:{type:'事实',content:'${memory_marker}'}},{name:'memory.editLayerFile',args:{file:'MEMORY.md',content:'${memory_edit_content}',beforeSha256:'${memory_before_sha256}'}},{name:'memory.readFiles',args:{files:['MEMORY.md','index.json']}}]],['MEM-05','面板与文件口径',[{name:'memory.readOverview',args:{}},{name:'memory.readFiles',args:{files:['MEMORY.md','index.json','.entry-meta.json']}}]],['MEM-16','记忆配置读值',[{name:'memory.readOverview',args:{}}]]];
for(const [case_id,title,calls] of plans)coverage.cases.push({case_id,title,feature_path:['记忆与进化',title],source:'PC88 770dacd；本机修正试用',coverage_level:'partial',limits:'仅提供这些操作入口；不能据此宣称完整测试项通过。见记忆模块文档。',preparation:case_id==='MEM-02'?['fixtures.backupFile']:[],calls,corrections:[]});
coverage.total=coverage.cases.length;coverage.memory_partial=4;coverage.scope+='；4个记忆部分操作计划（不等于18项记忆全覆盖）';fs.writeFileSync(coveragePath,JSON.stringify(coverage,null,2)+'\n');
console.log(JSON.stringify({newFunctions:candidates.map(f=>f.name.replace('mem.','memory.')),partialPlans:plans.map(p=>p[0])}));
