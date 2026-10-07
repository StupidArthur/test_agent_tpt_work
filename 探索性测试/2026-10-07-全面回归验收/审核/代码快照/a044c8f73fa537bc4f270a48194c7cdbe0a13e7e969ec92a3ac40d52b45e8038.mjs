import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),source=path.resolve(root,'../2026-10-06-函数体系全面回归');
const env=JSON.parse(fs.readFileSync(path.join(source,'环境记录.json'),'utf8'));env.environment_id='acceptance-20261007';env.ui_timeout_ms=5000;
fs.writeFileSync(path.join(root,'环境记录.json'),JSON.stringify(env,null,2));fs.writeFileSync(path.join(root,'运行上下文.json'),JSON.stringify({extension_run:'acceptance-20261007'},null,2));
fs.mkdirSync(path.join(root,'code/business'),{recursive:true});fs.writeFileSync(path.join(root,'code/business/catalog.json'),JSON.stringify({functions:[{name:'audit.inspectSurface',file:'code/business/inspect.mjs',export:'inspectSurface',parameters:{type:'object',properties:{},additionalProperties:false}}]},null,2));
