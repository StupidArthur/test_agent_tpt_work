// 一次性目录迁移：只更新活动入口和主库文档，保留历史证据/任务脚本。
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),repo=path.resolve(root,'../..');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const selected=[path.join(repo,'AGENTS.md'),path.join(repo,'README.md'),...walk(path.join(repo,'skills')).filter(p=>p.endsWith('.md')),path.join(repo,'02-测试方法与技术参考/下一轮测试代码分层设计.md'),...walk(path.join(root,'docs')).filter(p=>p.endsWith('.md')),path.join(root,'README.md'),path.join(root,'maintenance/build-tool-docs.mjs'),path.join(root,'automation/session.mjs')];
let changed=0;for(const p of selected){if(!fs.existsSync(p))continue;const before=fs.readFileSync(p,'utf8');const after=before.replaceAll('tools/tpt-work','tools/ui-operations').replaceAll('tools\\tpt-work','tools\\ui-operations').replaceAll('TPT Work 工具文档入口','软件 UI 操作工具入口');if(after!==before){fs.writeFileSync(p,after);changed++;}}
const legacy=path.join(repo,'tools/tpt-work');fs.mkdirSync(legacy,{recursive:true});
fs.writeFileSync(path.join(legacy,'README.md'),'# 旧路径兼容入口\n\n工具库已迁至 [软件 UI 操作工具](../ui-operations/README.md)。本目录只有历史脚本需要的转发模块；新任务统一使用 tools/ui-operations，不在本目录新增实现。\n');
const forwards=walk(root).filter(p=>p.endsWith('.mjs')&&(p.startsWith(path.join(root,'automation')+path.sep)||p.startsWith(path.join(root,'business')+path.sep)));
for(const p of forwards){const target=path.join(legacy,path.relative(root,p));fs.mkdirSync(path.dirname(target),{recursive:true});const relative=path.relative(path.dirname(target),p).replaceAll('\\','/');fs.writeFileSync(target,`// 兼容历史任务；唯一实现位于 tools/ui-operations。\nexport * from '${relative}';\n`);}
fs.writeFileSync(path.join(legacy,'call.mjs'),`// 兼容历史任务；新任务用 tools/ui-operations/call.mjs。\nimport path from 'node:path';import {fileURLToPath} from 'node:url';\nimport {main} from '../ui-operations/call.mjs';export * from '../ui-operations/call.mjs';\nif(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(JSON.stringify({error:{type:e.name,message:e.message}}));process.exitCode=1;});\n`);
console.log(JSON.stringify({changed_active_documents:changed,forward_modules:forwards.length+1,implementation:'tools/ui-operations',legacy:'tools/tpt-work'}));
