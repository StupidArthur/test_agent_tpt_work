import {connect} from '../../../../tools/ui-operations/automation/session.mjs';
export async function readSurface(ctx){
 const c=await connect(ctx);try{
  return await ctx.recorder.read('当前预设与专家表面','preset-surface',{channel:'dom',scope:'当前主页面及专家iframe'},async()=>({value:await Promise.all(c.page.frames().map(async f=>({url:f.url(),text:await f.locator('body').innerText(),buttons:await f.locator('button').evaluateAll(bs=>bs.filter(b=>b.getBoundingClientRect().width>0).map(b=>({text:b.innerText,label:b.getAttribute('aria-label')})))})))}));
 }finally{await c.close();}
}
