import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('../../automation/link_fixture.py',import.meta.url));
const helpers=new Map();
// Direct module callers can retain this process handle; CLI callers stop via the stored PID file.
export async function startLinkServer(ctx,args){
 const log=path.join(ctx.taskRoot,'运行日志','links-'+args.run+'.jsonl'),state=path.join(ctx.taskRoot,'运行日志','links-'+args.run+'.server.json');
 if(fs.existsSync(state))throw Error('Server state exists: stop or verify the existing helper before starting another');
 let child,result;
 const action=await ctx.recorder.action('启动本轮本地链接夹具','spawn',{log},async()=>{result=await new Promise((resolve,reject)=>{
  child=spawn(ctx.environment.python||'python',['-X','utf8',script,'--run',args.run,'--log',log,'--task-root',ctx.taskRoot],{windowsHide:true,stdio:['ignore','pipe','pipe']});let text='',err='';const timer=setTimeout(()=>{child.kill();reject(Error('Link fixture startup timeout'));},5000);
  child.stderr.on('data',d=>err+=d);child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('exit',code=>{clearTimeout(timer);if(!text.includes('\n'))reject(Error(err||'Link fixture exited '+code));});
  child.stdout.on('data',d=>{text+=d;if(text.includes('\n')){clearTimeout(timer);try{resolve(JSON.parse(text.split('\n')[0]));}catch(e){child.kill();reject(e);}}});
 });fs.writeFileSync(state,JSON.stringify({...result,pid:child.pid,script,run:args.run}));helpers.set(child.pid,child);child.stdout.destroy();child.stderr.destroy();child.unref();});
 const read=await ctx.recorder.read('本地链接服务地址与进程',args.run,{channel:'process',scope:state},async()=>({value:{...result,pid:child.pid,state},raw:{script}}));return {action_refs:[action.event_id],observations:{read}};
}
export async function stopLinkServer(ctx,args){const state=path.resolve(args.state);if(!state.startsWith(path.join(ctx.taskRoot,'运行日志')+path.sep))throw Error('Server state must belong to this task');const data=JSON.parse(fs.readFileSync(state,'utf8'));if(data.script!==script)throw Error('Unexpected helper identity');
 let exists=true;try{process.kill(data.pid,0);}catch(e){if(e.code==='ESRCH')exists=false;else throw e;}if(!exists){const read=await ctx.recorder.read('链接夹具进程已不存在',data.pid,{channel:'process',scope:state},async()=>({value:{pid:data.pid,already_stopped:true},raw:{pid:data.pid,processExists:false}}));fs.writeFileSync(state,JSON.stringify({...data,stopped_at:new Date().toISOString(),stop_reason:'PID absent before stop'}));return {observations:{read}};}
 // Match the loopback endpoint's marker before stopping the saved process.
 const response=await fetch(data.base_url,{signal:AbortSignal.timeout(2000)});const text=await response.text();if(!text.includes('FAST_LINK_TARGET '+data.run))throw Error('Helper endpoint identity changed');
 const action=await ctx.recorder.action('停止本轮链接夹具','kill',{pid:data.pid},async()=>{process.kill(data.pid);helpers.delete(data.pid);fs.writeFileSync(state,JSON.stringify({...data,stopped_at:new Date().toISOString()}));});return {action_refs:[action.event_id],observations:{pid:data.pid,stop_requested:true}};}
