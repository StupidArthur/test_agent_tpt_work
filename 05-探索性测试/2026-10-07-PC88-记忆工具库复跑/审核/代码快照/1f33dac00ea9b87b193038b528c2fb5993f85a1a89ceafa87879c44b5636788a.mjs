import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRecorder} from './automation/recorder.mjs';
import {discover,discovery} from './automation/discovery.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
export const catalog=JSON.parse(fs.readFileSync(path.join(root,'business/catalog.json'),'utf8'));
export function taskCatalog(taskRoot){const p=taskRoot&&path.join(taskRoot,'code/business/catalog.json');if(!p||!fs.existsSync(p))return catalog;const local=JSON.parse(fs.readFileSync(p,'utf8')),entries=Array.isArray(local)?local:local.functions;if(!Array.isArray(entries))throw Error('Task catalog requires functions array');const names=new Set(catalog.functions.map(f=>f.name));for(const e of entries){if(names.has(e.name))throw Error('Task function name conflicts with library: '+e.name);names.add(e.name);const target=path.resolve(taskRoot,e.file);if(!target.startsWith(path.join(path.resolve(taskRoot),'code')+path.sep))throw Error('Task function must be in task/code: '+e.name);}return {...catalog,functions:[...catalog.functions,...entries.map(e=>({...e,task_local:true,version:e.version||'task-local-1.0'}))]};}
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function validate(schema,value,label='args'){
 if(schema.type){const ok=schema.type==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):schema.type==='array'?Array.isArray(value):schema.type==='integer'?Number.isInteger(value):typeof value===schema.type;if(!ok)throw Error(label+' must be '+schema.type);}
 if(schema.enum&&!schema.enum.includes(value))throw Error(label+' invalid enum');
 if(schema.type==='object'){for(const key of schema.required||[])if(!Object.hasOwn(value,key))throw Error(label+'.'+key+' required');for(const [key,v]of Object.entries(value)){const rule=schema.properties?.[key];if(!rule&&schema.additionalProperties===false)throw Error(label+'.'+key+' unknown');if(rule)validate(rule,v,label+'.'+key);}}
 if(schema.type==='array'&&schema.items)for(const v of value)validate(schema.items,v,label+'[]');
}
function modules(){const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);return [...walk(path.join(root,'business')), ...walk(path.join(root,'automation')),path.join(root,'call.mjs')].filter(p=>p.endsWith('.mjs')||p.endsWith('.json')||p.endsWith('.py'));}
export async function invoke(name,args,{taskRoot,environment,runtime={},shared={},expectedSession}={}){
 const entry=taskCatalog(taskRoot).functions.find(f=>f.name===name);if(!entry)throw Error('Unknown business function '+name);validate(entry.parameters,args);
 if(!taskRoot||!environment?.environment_id)throw Error('taskRoot and environment.environment_id required');
 const callId='CALL-'+crypto.randomUUID(),dir=path.join(taskRoot,'审核/函数调用',callId);fs.mkdirSync(dir,{recursive:true});
 const snapshotRoot=path.join(taskRoot,'审核/代码快照');fs.mkdirSync(snapshotRoot,{recursive:true});
 const taskCode=path.join(taskRoot,'code');const walkTask=d=>fs.readdirSync(d,{withFileTypes:true}).filter(e=>e.name!=='node_modules').flatMap(e=>e.isDirectory()?walkTask(path.join(d,e.name)):[path.join(d,e.name)]);
 const taskFiles=fs.existsSync(taskCode)?walkTask(taskCode).filter(p=>/\.(mjs|cjs|js|py|json)$/.test(p)):[];
 const versions=[...modules().map(p=>({p,label:path.relative(root,p)})),...taskFiles.map(p=>({p,label:'task/'+path.relative(taskRoot,p)}))].map(({p,label})=>{const hash=sha(p),snapshot=path.join(snapshotRoot,hash+path.extname(p));if(!fs.existsSync(snapshot))fs.copyFileSync(p,snapshot);return {path:label.replaceAll('\\','/'),sha256:hash,snapshot:path.relative(taskRoot,snapshot).replaceAll('\\','/')};});
 const argsPath=path.join(dir,'arguments.json');fs.writeFileSync(argsPath,JSON.stringify(args,null,2));
 const ctx={taskRoot,environment,runtime,environmentId:environment.environment_id,runId:runtime.extension_run,businessCallId:callId,managed:true,expectedSession,internalName:args.internalName,connection:shared.connection,recorder:createRecorder(taskRoot,{environment_id:environment.environment_id,business_call_id:callId})};
 const started=new Date().toISOString();let result,error;
 try{const mod=await import(pathToFileURL(path.resolve(entry.task_local?taskRoot:root,entry.file)).href);result=await mod[entry.export](ctx,args);}catch(e){error={type:e.name,message:e.message};}
 shared.connection=ctx.connection;
 const returned={call_id:callId,status:error?'error':'returned',...(error?{error}:{observations:result})};
 const returnPath=path.join(dir,'return.json');fs.writeFileSync(returnPath,JSON.stringify(returned,null,2));
 const event={kind:'business_call',call_id:callId,function_name:name,function_version:entry.version,environment_id:environment.environment_id,started_at:started,ended_at:new Date().toISOString(),status:returned.status,args_path:path.relative(taskRoot,argsPath).replaceAll('\\','/'),args_sha256:sha(argsPath),return_path:path.relative(taskRoot,returnPath).replaceAll('\\','/'),return_sha256:sha(returnPath),modules:versions,...(error?{error}:{})};
 fs.mkdirSync(path.join(taskRoot,'运行日志'),{recursive:true});fs.appendFileSync(path.join(taskRoot,'运行日志/业务调用.jsonl'),JSON.stringify(event)+'\n');
 return returned;
}
export async function main(){
 const argv=process.argv.slice(2),flag=n=>{const i=argv.indexOf(n);return i>=0?argv[i+1]:undefined;};
 if(argv[0]==='--modules'){console.log(JSON.stringify(discovery.modules,null,2));return;}
 if(argv[0]==='--find'){console.log(JSON.stringify(discover(taskCatalog(flag('--task')).functions,argv[1]||'',{module:flag('--module'),limit:flag('--limit')===undefined?5:Number(flag('--limit'))}),null,2));return;}
 if(argv[0]==='--list'){const query=argv[1]&&!argv[1].startsWith('--')?argv[1]:'';console.log(JSON.stringify(taskCatalog(flag('--task')).functions.filter(f=>!query||[f.name,...(f.feature_path||[]),f.description||''].join(' ').includes(query)).map(({name,feature_path,description})=>({name,feature_path,description})),null,2));return;}
 if(argv[0]==='--describe'){const e=taskCatalog(flag('--task')).functions.find(f=>f.name===argv[1]);if(!e)throw Error('Unknown function');console.log(JSON.stringify({...e,...(discovery.contracts[e.name]?{selection:discovery.contracts[e.name]}:{})},null,2));return;}
 if(argv[0]==='--plan'){const plan=JSON.parse(fs.readFileSync(path.join(root,'coverage/cases.json'),'utf8')).cases.find(c=>c.case_id===argv[1]);if(!plan)throw Error('Unknown case');console.log(JSON.stringify(plan,null,2));return;}
 const taskRoot=path.resolve(flag('--task')||''),argsFile=flag('--args-file');if(!flag('--task')||!argsFile)throw Error('Usage: node call.mjs function --task <taskDir> --args-file <jsonFile> [--session-id id]');
 const environment=JSON.parse(fs.readFileSync(path.join(taskRoot,'环境记录.json'),'utf8')),runtime=fs.existsSync(path.join(taskRoot,'运行上下文.json'))?JSON.parse(fs.readFileSync(path.join(taskRoot,'运行上下文.json'),'utf8')):{};
 const args=JSON.parse(fs.readFileSync(path.resolve(argsFile),'utf8'));const batch=argv[0]==='--batch'?args:[{name:argv[0],args}];if(!Array.isArray(batch)||!batch.length)throw Error('Batch must contain calls');
 for(const c of batch){const e=taskCatalog(taskRoot).functions.find(f=>f.name===c.name);if(!e)throw Error('Unknown function '+c.name);validate(e.parameters,c.args);}
 const lock=path.join(root,'.ui.lock');try{fs.mkdirSync(lock);}catch(e){if(e.code==='EEXIST')throw Error('Another tool call owns the UI lock; wait for it to finish');throw e;}fs.writeFileSync(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid,started_at:new Date().toISOString(),taskRoot}));
 const shared={};try{for(const c of batch){const r=await invoke(c.name,c.args,{taskRoot,environment,runtime,shared,expectedSession:c.expectedSession||flag('--session-id')});console.log(JSON.stringify(r,null,2));if(r.status==='error'){process.exitCode=1;break;}}}finally{try{await shared.connection?.close();}finally{fs.unlinkSync(path.join(lock,'owner.json'));fs.rmdirSync(lock);}}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(JSON.stringify({error:{type:e.name,message:e.message}}));process.exitCode=1;});
