// Synthetic gate tests in an isolated temp folder, never product execution data.
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),assert=require('assert'),{spawnSync}=require('child_process');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tpt-record-gate-'));
for(const dir of ['tools','用例','结果','运行日志','夹具'])fs.mkdirSync(path.join(temp,dir));
for(const file of ['check-records.cjs','compare.cjs'])fs.copyFileSync(path.join(__dirname,file),path.join(temp,'tools',file));
const stamp='2026-10-06T01:00:00.000Z',sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const write=(p,o)=>fs.writeFileSync(path.join(temp,p),JSON.stringify(o,null,2)+'\n');
function scenario({actual=true,missingRaw=false,indexLog=true,operator='equals',mismatchedObject=false}={}){
 const c={id:'TEST-01',contract_version:'2.0',assertions:[{id:'TEST-01-A1',operator,expected:operator==='equals'?true:null}]};write('用例/cases.json',[c]);write('夹具/manifest.json',[]);
 const queue=fs.readFileSync(path.join(temp,'用例/cases.json'));
 write('环境记录.json',{environment_id:'ENV-TEST',captured_at:stamp,cdp_endpoint:'http://127.0.0.1:9234',project:'synthetic only',app_identity:{path:'mock.exe',sha256:'a'.repeat(64)},fixture_manifest:'夹具/manifest.json',queue_sha256:sha(queue)});
 const read={event_id:'read-1',captured_at:stamp,kind:'read',environment_id:'ENV-TEST',target:'sample switch',object_id:'sample',source:{channel:'dom',scope:'test card',locator:'mock selector'},value:actual,raw:{checked:actual},derivation:'checked is true'};
 if(missingRaw)delete read.raw;
 const events=[{event_id:'action-1',captured_at:stamp,kind:'action',environment_id:'ENV-TEST',target:'sample',action:'click'},read];
 let refs=['read-1'],value=actual;
 if(operator==='same_value'){read.value='unchanged';const second={...read,event_id:'read-2',value:'unchanged',object_id:mismatchedObject?'different object':'sample'};events.push(second);refs.push('read-2');value={before:'unchanged',after:'unchanged'};}
 const log=events.map(e=>JSON.stringify(e)).join('\n')+'\n';fs.writeFileSync(path.join(temp,'运行日志/test.jsonl'),log);
 const evidence=indexLog?[{path:'运行日志/test.jsonl',sha256:sha(log)}]:[{path:'夹具/manifest.json',sha256:sha(fs.readFileSync(path.join(temp,'夹具/manifest.json')))}];
 write('结果/TEST-01.json',{case_id:'TEST-01',contract_version:'2.0',attempt_id:'TEST-01-A01',environment_id:'ENV-TEST',started_at:stamp,ended_at:stamp,object_identity:{id:'sample'},inputs:[],actual_steps:['synthetic action'],action_refs:['action-1'],cleanup:{status:'unchanged',description:'synthetic only'},status:actual===null?'不确定':actual===false?'失败':'通过',assertions:[{id:'TEST-01-A1',actual:value,read_refs:refs,...(actual===null?{reason:'target unavailable',failed_dependency:'mock locator'}:{})}],evidence});
 const result=spawnSync(process.execPath,[path.join(temp,'tools/check-records.cjs')],{encoding:'utf8'});assert(result.stdout,result.stderr);return JSON.parse(result.stdout);
}
assert.equal(scenario().record_complete,true);
assert.equal(scenario({actual:false}).counts.失败,1);
const uncertain=scenario({actual:null});assert.equal(uncertain.record_complete,true);assert.equal(uncertain.business_fully_observed,false);
assert(scenario({missingRaw:true}).issues.some(x=>x.includes('raw/formula')));
assert(scenario({indexLog:false}).issues.some(x=>x.includes('log not indexed')));
assert(scenario({operator:'same_value',mismatchedObject:true}).issues.some(x=>x.includes('wrong object')));
assert.equal(scenario({operator:'same_value'}).record_complete,true);
console.log('7 synthetic record-gate checks passed; no UI actions. Temp artifacts: '+temp);
