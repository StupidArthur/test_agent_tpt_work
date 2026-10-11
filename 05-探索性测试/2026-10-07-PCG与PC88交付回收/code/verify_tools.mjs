import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {invoke,catalog} from '../../../tools/ui-operations/call.mjs';
import {discover} from '../../../tools/ui-operations/automation/discovery.mjs';

const taskRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const environment=JSON.parse(fs.readFileSync(path.join(taskRoot,'环境记录.json')));
const results=[];
async function call(name,args){const r=await invoke(name,args,{taskRoot,environment});results.push({name,args,call_id:r.call_id,status:r.status,error:r.error});return r;}
const folder=path.join(taskRoot,'文件试用',String(Date.now()));fs.mkdirSync(folder,{recursive:true});
const target=path.join(folder,'new.txt');
const absent=await call('fixtures.readFile',{path:target});
const absentReadRef=absent.observations.observations.read.event_id;
const written=await call('fixtures.writeFile',{path:target,content:'review-owned harmless cleanup fixture'});
const expectedSha256=written.observations.observations.read.value.sha256;
const args={path:target,expectedSha256,absentReadRef};
for(const [label,a] of [
 ['wrong hash',{...args,expectedSha256:'0'.repeat(64)}],
 ['unknown baseline',{...args,absentReadRef:'CALL-not-a-baseline'}],
 ['outside root',{...args,path:path.resolve(taskRoot,'../../outside-review.txt')}],
 ['protected case-insensitive',{...args,path:path.join(folder,'memory.MD')}],
 ['directory',{...args,path:folder}],
]){const r=await call('fixtures.removeCreatedFile',a);assert.equal(r.status,'error',label);assert.ok(fs.existsSync(target));}
let missingRejected=false;try{await call('fixtures.removeCreatedFile',{path:target,absentReadRef});}catch(e){missingRejected=/expectedSha256/.test(e.message);}assert.ok(missingRejected);
const removed=await call('fixtures.removeCreatedFile',args);assert.equal(removed.status,'returned');assert.equal(removed.observations.observations.read.value.exists,false);
const reread=await call('fixtures.readFile',{path:target});assert.equal(reread.observations.observations.read.raw.exists,false);
const found=[['恢复 新增文件','fixtures.removeCreatedFile'],['插件 展开','settings.setPluginExpanded'],['会话 搜索','conversation.searchSessions'],['记忆 编辑','memory.editLayerFile']].map(([query,expected])=>{const result=discover(catalog.functions,query,{limit:5});assert.ok(result.candidates.some(x=>x.name===expected),query);return {query,expected,candidates:result.candidates.map(x=>x.name)};});
fs.writeFileSync(path.join(taskRoot,'审核/工具本机验证.json'),JSON.stringify({fileTests:'passed',missingHashRejected:missingRejected,discovery:found,calls:results},null,2));
console.log(JSON.stringify({fileTests:'passed',calls:results.length,discovery:found},null,2));
