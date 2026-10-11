import { connect,cdpBaseFromEnv } from '../../automation/session.mjs';
import fs from 'node:fs';
import crypto from 'node:crypto';
export async function inspectConnection(ctx,args={}){
 const base=cdpBaseFromEnv(ctx.environment);const c=await connect(ctx);try{
 const read=await ctx.recorder.read('CDP实例身份','app-target',{channel:'cdp',scope:base},async()=>{
  const [v,t]=await Promise.all([fetch(base+'/json/version').then(r=>{if(!r.ok)throw Error('CDP version '+r.status);return r.json();}),fetch(base+'/json/list').then(r=>{if(!r.ok)throw Error('CDP list '+r.status);return r.json();})]);
  const text=await c.page.locator('body').innerText();let packageIdentity=null;
  if(args.asarPath){const data=fs.readFileSync(args.asarPath);packageIdentity={path:args.asarPath,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};}
  return {value:{url:c.page.url(),version:v,targets:t,mainReadable:!!text.trim(),packageIdentity},raw:{text}};
 });return {observations:{read}};
 }finally{await c.close();}
}
