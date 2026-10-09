import fs from 'node:fs';
import path from 'node:path';
export function createRecorder(taskRoot,{environment_id,business_call_id}){
 const log=path.join(taskRoot,'运行日志/business.jsonl');fs.mkdirSync(path.dirname(log),{recursive:true});let seq=0;
 const append=(kind,target,data)=>{const e={event_id:`${business_call_id}-${++seq}`,captured_at:new Date().toISOString(),environment_id,business_call_id,kind,target,...data};fs.appendFileSync(log,JSON.stringify(e)+'\n');return e;};
 return {
  async read(target,object_id,source,fn){try {const data=await fn();if(!data||!Object.hasOwn(data,'value'))throw Error('Read must return value and raw');return append('read',target,{object_id,source,...data});}catch(e){append('read',target,{object_id,source,value:null,error:{type:e.name,message:e.message}});throw e;}},
  async action(target,action,input,fn){append('action',target,{action,input,outcome:'attempted'});try{await fn();return append('action',target,{action,input,outcome:'completed'});}catch(e){append('action',target,{action,input,outcome:'failed',error:{type:e.name,message:e.message}});throw e;}}
 };
}
