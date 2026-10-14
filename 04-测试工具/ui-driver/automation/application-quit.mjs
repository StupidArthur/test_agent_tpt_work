import fs from 'node:fs';
import {runNative} from './native-window.mjs';
export async function quitApplication(ctx,args) {
 if(!Number.isSafeInteger(args.processId)||args.processId<=0)throw Error('Positive processId required');
 if(!args.expectedProcessStartTimeUtc?.trim())throw Error('Exact process start time required');
 if(!/^(?:[A-Za-z]:[\\/]|\\\\[^\\]+\\[^\\]+[\\/])/.test(args.executablePath||'')||!fs.statSync(args.executablePath).isFile())throw Error('Existing fully qualified executablePath required');
 const timeoutMs=args.timeoutMs??10000;
 if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)throw Error('timeoutMs must be 100..30000');
 // Drop only this caller's CDP client; stopping software is a separate explicit action.
 if(ctx.connection){await ctx.connection.close();ctx.connection=undefined;}
 let raw;
 const action=await ctx.recorder.action('application','terminate bound instance',{...args,method:'terminateBoundProcessTree'},async()=>{
  raw=await runNative({...args,timeoutMs,mode:'quit'},{timeoutMs:timeoutMs+15000,executionPolicy:ctx.environment.native_execution_policy});
 });
 const read=await ctx.recorder.read('application exit',String(args.processId),{channel:'Windows process',scope:'bound process tree and exact executable absence'},async()=>({value:raw.observations,raw}));
 return {...read.value,action_ref:action.event_id,evidence_ref:read.event_id,businessVerified:false};
}
