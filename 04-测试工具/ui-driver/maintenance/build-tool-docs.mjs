import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {discovery} from '../automation/discovery.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'business/catalog.json'),'utf8'));
const known=new Map(catalog.functions.map(f=>[f.name,f]));
const assigned=new Set(),ids=new Set();
for(const r of discovery.routes){
 if(ids.has(r.id)||!discovery.modules.some(m=>m.name===r.module))throw Error('Invalid route '+r.id);
 ids.add(r.id);
 for(const name of r.functions){if(!known.has(name))throw Error('Unknown route function '+name);assigned.add(name);}
}
for(const name of known.keys())if(!assigned.has(name))throw Error('Unclassified function '+name);
const docs=path.join(root,'docs');
for(const dir of ['modules','scenarios'])fs.mkdirSync(path.join(docs,dir),{recursive:true});
const esc=s=>String(s??'').replaceAll('|','\\|').replaceAll('\n',' ');
const write=(file,lines)=>fs.writeFileSync(path.join(docs,file),lines.join('\n')+'\n');
const index=['# 按目标找工具','','选择目标对象 → 操作场景 → 少量候选 → 单个函数契约。已知函数名直接 `--describe`；有 case 编号优先 `--plan <编号>`。','','| 目标对象 | 场景入口 |','|---|---|'];
for(const m of discovery.modules){
 const routes=discovery.routes.filter(r=>r.module===m.name);
 index.push(`| ${m.title} | [${m.name}：${routes.length} 个场景](modules/${m.name}.md) |`);
 const lines=[`# ${m.title}`,'','[返回目标索引](../功能索引.md)','','选择当前操作意图，只读一个场景。此页不展开函数参数或实现。','','| 要做什么 | 意图 | 下一份资料 |','|---|---|---|'];
 for(const r of routes){
  lines.push(`| ${r.title} | ${r.intent} | [候选与指导](../scenarios/${r.id}.md) |`);
  const leaf=[`# ${r.title}`,'',`[返回${m.title}](../modules/${m.name}.md)`,'',r.guide,'','| 候选函数 | 用途 |','|---|---|'];
  for(const name of r.functions)leaf.push(`| \`${name}\` | ${esc(known.get(name).description)} |`);
  leaf.push('','只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。','',`命令行同一路径：\`--browse ${r.id}\`；场景内检索：\`--find "关键词" --route ${r.id} --limit 3\`。`);
  if(m.name==='memory')leaf.push('','涉及本机记忆文件或写入时再读 [记忆与进化](../记忆与进化.md)。');
  write(`scenarios/${r.id}.md`,leaf);
 }
 lines.push('',`命令行：\`node 04-测试工具/ui-driver/call.mjs --browse ${m.name}\`。`,'','场景不匹配时返回目标索引，或 `--find "业务词" --module '+m.name+' --limit 3`。找不到再按 [扩展与边界](../扩展与边界.md) 核对缺口。');
 write(`modules/${m.name}.md`,lines);
}
index.push('','## 命令行逐层发现','','```powershell','node 04-测试工具/ui-driver/call.mjs --browse','node 04-测试工具/ui-driver/call.mjs --browse skills','node 04-测试工具/ui-driver/call.mjs --browse skills.use','node 04-测试工具/ui-driver/call.mjs --describe skills.useSkillDirect','```','','明确关键词可直接 `--find "技能 快捷使用" --module skills --limit 3`；候选含义不清时回到场景比较用途。任务新增函数使用 `--find "关键词" --task <任务目录>`，不要求先加入共享分类。','','拿到正确函数、参数来源、实际断言取值与恢复方法即可开始；仅异常或开发需要继续读深层资料。','','本页与场景页由 catalog.json 和 discovery.json 生成。登记数量不等于实机验证数量。');
write('功能索引.md',index);
console.log(JSON.stringify({functions:known.size,categories:discovery.modules.length,scenarios:discovery.routes.length}));
