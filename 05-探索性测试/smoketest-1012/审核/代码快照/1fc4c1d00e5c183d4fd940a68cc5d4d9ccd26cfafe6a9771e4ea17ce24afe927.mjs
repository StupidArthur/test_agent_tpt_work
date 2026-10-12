import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runNative} from './native-window.mjs';
import {playwright} from './session.mjs';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function system(request,environment){
 const policy=environment.native_execution_policy;
 if(policy&&!['Bypass','RemoteSigned'].includes(policy))throw Error('Unsupported process execution policy');
 return new Promise((resolve,reject)=>{
  const args=['-NoProfile','-NonInteractive'];if(policy)args.push('-ExecutionPolicy',policy);
  args.push('-File',fileURLToPath(new URL('./application-system.ps1',import.meta.url)),'-RequestBase64',Buffer.from(JSON.stringify(request)).toString('base64'));
  const child=spawn(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),args,{windowsHide:true,stdio:['ignore','pipe','pipe']});
  let out='',err='';child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);
  const timer=setTimeout(()=>{child.kill();reject(Error('Application system helper timeout'));},12000);
  child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('close',code=>{clearTimeout(timer);try{const raw=JSON.parse(out.trim());if(code!==0||raw.status!=='ok')throw Error(raw.error||err);resolve(raw);}catch(e){reject(e);}});
 });
}
export async function openApplication(ctx,args){
 if(process.platform!=='win32')throw Error('Windows application startup only');
 if(!args.expectedWindowTitle?.trim())throw Error('Exact nonempty expectedWindowTitle required');
 if(args.processId!==undefined&&(!Number.isSafeInteger(args.processId)||args.processId<=0))throw Error('Explicit processId must be a positive safe integer');
 if(!/^(?:[A-Za-z]:[\\/]|[\\/]{2}[^\\/]+[\\/][^\\/]+(?:[\\/]|$))/.test(args.executablePath)||!fs.statSync(args.executablePath).isFile())throw Error('Existing absolute executablePath required');
 const timeout=args.timeoutMs??20000;if(timeout<1000||timeout>60000)throw Error('timeoutMs outside 1000..60000');
 let endpoint,port;
 if(args.cdpEndpoint!==undefined){endpoint=new URL(args.cdpEndpoint);if(endpoint.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname)||endpoint.username||endpoint.password||endpoint.pathname!=='/'||endpoint.search||endpoint.hash)throw Error('Local HTTP CDP origin required');port=Number(endpoint.port||80);if(!Number.isInteger(port)||port<1||port>65535)throw Error('CDP port must be in 1..65535');if(!args.targetUrlPrefix?.trim())throw Error('targetUrlPrefix required with CDP');}
 const phases=[],start=Date.now();
 async function phase(name,fn){const s=Date.now();try{const v=await fn();phases.push({name,elapsedMs:Date.now()-s,status:'ok'});return v;}catch(e){phases.push({name,elapsedMs:Date.now()-s,status:'error'});e.applicationProgress={phases,elapsedMs:Date.now()-start};throw e;}}
 let inventory;
 const inspected=await phase('inspectIdentityAndPort',()=>ctx.recorder.read('application','startup inventory',{channel:'Windows process/TCP',scope:'exact executable path and local port'},async()=>{const raw=await system({mode:'inspect',executablePath:args.executablePath,port},ctx.environment);return{value:raw.observations,raw};}));inventory=inspected.value;
 if(inventory.processes.some(p=>p.sessionId!==inventory.currentSessionId))throw Error('Matching application outside current interactive session');
 const listeners=inventory.listeners||[],candidates=args.processId?inventory.processes.filter(p=>p.processId===args.processId):inventory.processes;
 if(args.processId&&candidates.length!==1)throw Error('Requested processId is not the exact executable instance');
 if(listeners.some(l=>!candidates.some(p=>p.processId===l.processId)))throw Error('CDP port belongs to another executable; no launch');
 let processInfo,launched=false;
 if(port){const owners=[...new Set(listeners.map(l=>l.processId))];if(owners.length>1)throw Error('Multiple CDP listener owners');processInfo=owners.length?candidates.find(p=>p.processId===owners[0]):null;if(!processInfo&&candidates.length)throw Error('Existing application has no requested CDP listener; duplicate launch refused');}
 else {if(candidates.length>1)throw Error('Multiple existing application processes require explicit CDP ownership');processInfo=candidates[0];}
 if(!processInfo){if(!args.allowLaunch)throw Error('No existing instance and allowLaunch is false');let raw;await phase('launch',()=>ctx.recorder.action('application','launch',{executablePath:args.executablePath,arguments:args.arguments||[]},async()=>{raw=await system({mode:'launch',executablePath:args.executablePath,arguments:args.arguments||[],port},ctx.environment);}));processInfo=raw.observations.processes[0];launched=true;await ctx.recorder.read('application launched identity',String(processInfo.processId),{channel:'Windows process',scope:'actual launch return; recovery identity'},async()=>({value:processInfo,raw}));}
 const limit=Date.now()+timeout;
 let native,window,cdp,portBinding=null;
 await phase('nativeWindowReady',async()=>{
  do{native=await runNative({mode:'state',processId:processInfo.processId},{executionPolicy:ctx.environment.native_execution_policy});if(native.observations.identity.processStartTimeUtc!==processInfo.processStartTimeUtc)throw Error('Application process identity changed');const matches=native.observations.windows.filter(w=>w.title===args.expectedWindowTitle);if(matches.length>1)throw Error('Window title is ambiguous');window=matches[0];if(window)break;await wait(200);}while(Date.now()<limit);
  if(!window)throw Error('Expected native window was not observed before timeout');
  const e=await ctx.recorder.read('application native window',window.hwnd,{channel:'Win32',scope:'exact startup identity'},async()=>({value:native.observations,raw:native}));
  if(args.ensureVisible&&(!window.visible||window.minimized)){let restored;await ctx.recorder.action('application window','restore',{processInfo,window},async()=>{restored=await runNative({mode:'restore',processId:processInfo.processId,windowHwnd:window.hwnd,expectedTitle:window.title,expectedProcessStartTimeUtc:processInfo.processStartTimeUtc,requestForeground:false},{executionPolicy:ctx.environment.native_execution_policy});});const after=await ctx.recorder.read('application restored window',window.hwnd,{channel:'Win32',scope:'post-action actual state'},async()=>({value:restored.observations,raw:restored}));window=after.value.after;if(!restored.observations.restored)throw Error('Native window restoration did not complete');}
  return e;
 });
 if(port)await phase('cdpPageReady',async()=>{
  let last;do{let browser;try{
   // Recheck socket ownership after launch; never connect to a different process.
   const ownership=await ctx.recorder.read('application','current CDP port ownership',{channel:'Windows process/TCP',scope:'fresh bound process and local port after native readiness'},async()=>{const raw=await system({mode:'inspect',executablePath:args.executablePath,port},ctx.environment);return{value:raw.observations,raw};});
   const now=ownership.value,bound=now.processes.find(p=>p.processId===processInfo.processId);
   if(!bound||bound.processStartTimeUtc!==processInfo.processStartTimeUtc)throw Error('Application process identity changed before CDP connect');
   if(!now.listeners.length||now.listeners.some(l=>l.processId!==processInfo.processId))throw Error('CDP listener not owned by bound application');
   portBinding={port,listeners:now.listeners,inventory_event:ownership.event_id};
   browser=await playwright().chromium.connectOverCDP(endpoint.origin,{timeout:Math.max(1,Math.min(3000,limit-Date.now()))});
   const pages=browser.contexts().flatMap(c=>c.pages()).filter(p=>p.url().startsWith(args.targetUrlPrefix));if(pages.length!==1)throw Error('Expected unique CDP page target');
   const page=pages[0];cdp={targetCount:pages.length,url:page.url(),title:await page.title(),body:await page.locator('body').innerText({timeout:2000}),visibilityState:await page.evaluate(()=>document.visibilityState)};if(!cdp.body.trim())throw Error('CDP target body empty');
   await ctx.recorder.read('application CDP target',cdp.url,{channel:'CDP DOM',scope:'bound process actual target'},async()=>({value:cdp,raw:cdp}));return;
  }catch(e){last=e.message;}finally{if(browser)await browser.close();}await wait(200);}while(Date.now()<limit);throw Error('CDP readiness timeout: '+last);
 });
 return{processInfo,launched,reused:!launched,window,cdp:cdp||null,portBinding,phases,elapsedMs:Date.now()-start,ready:!!window&&(!port||!!cdp),businessVerified:false,occlusionVerified:false};
}
