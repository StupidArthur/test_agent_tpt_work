// Isolated offline checks. Never connects to TPT Work or writes real case results.
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert'),{spawnSync}=require('child_process');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'tpt-business-call-'));
for(const directory of ['tools','code/business/test','code/automation','审核','运行日志','结果'])fs.mkdirSync(path.join(root,directory),{recursive:true});
for(const file of ['call-business.mjs','record.cjs','check-code.cjs'])fs.copyFileSync(path.join(__dirname,file),path.join(root,'tools',file));
const json=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v)+'\n');
json('任务状态.json',{execution_allowed:false});json('环境记录.json',{environment_id:'ENV-OFFLINE-TEST'});json('运行上下文.json',{extension_run:'offline-test'});json('args.json',{fixture:'input.txt'});
fs.writeFileSync(path.join(root,'input.txt'),'actual local fixture');
const implementation='code/business/test/read.mjs';
fs.writeFileSync(path.join(root,implementation),"import fs from 'node:fs'; import path from 'node:path'; export async function read(ctx,args){const p=path.join(ctx.taskRoot,args.fixture); const event=await ctx.recorder.read('fixture',p,{channel:'file',scope:'offline fixture',locator:p},async()=>({value:fs.readFileSync(p,'utf8')}));return {actual:event.value,readRefs:[event.event_id]};}\n");
json('code/business/catalog.json',{functions:[{name:'test.read',file:implementation,export:'read',version:'offline-1',modules:[],parameters:{required:['fixture'],additionalProperties:false,properties:{fixture:{type:'string'}}}}]});
function call(...args){return spawnSync(process.execPath,[path.join(root,'tools/call-business.mjs'),...args],{encoding:'utf8'});}
assert.equal(JSON.parse(call('--list').stdout).length,1);
assert.notEqual(call('test.read','--args-file','args.json').status,0);assert.equal(fs.existsSync(path.join(root,'运行日志/业务调用.jsonl')),false);
json('任务状态.json',{execution_allowed:true});
const success=call('test.read','--args-file','args.json');assert.equal(success.status,0,success.stderr);const returned=JSON.parse(success.stdout);assert.equal(returned.observations.actual,'actual local fixture');
const events=fs.readFileSync(path.join(root,'运行日志/business.jsonl'),'utf8').trim().split('\n').map(JSON.parse);assert.equal(events[0].business_call_id,returned.call_id);
const first=JSON.parse(fs.readFileSync(path.join(root,'运行日志/业务调用.jsonl'),'utf8').trim());assert.equal(first.modules.every(m=>m.sha256===m.sha256_after),true);assert(fs.existsSync(path.join(root,first.args_path)));assert(fs.existsSync(path.join(root,first.return_path)));
const originalSnapshot=fs.readFileSync(path.join(root,first.modules[0].snapshot),'utf8');
fs.writeFileSync(path.join(root,implementation),"export async function read(){throw new Error('offline failure');}\n");
assert.equal(fs.readFileSync(path.join(root,first.modules[0].snapshot),'utf8'),originalSnapshot);
const failed=call('test.read','--args-file','args.json');assert.equal(failed.status,1);assert.equal(JSON.parse(failed.stdout).status,'error');
const check=spawnSync(process.execPath,[path.join(root,'tools/check-code.cjs')],{encoding:'utf8'});assert.equal(check.status,0,check.stdout+check.stderr);assert.equal(JSON.parse(check.stdout).business_calls,2);
console.log('Offline bridge checks passed: waiting-state gate, real file read, call linkage, code/argument/return snapshots, preserved old version, error retention. Temp: '+root);
