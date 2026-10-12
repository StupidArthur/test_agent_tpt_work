import {connectLogin} from '../../automation/login-session.mjs';

// 只读：在主界面定位左下角账号显示，返回候选元素与其位置（供断言用户名用）。
export async function readHomeAccount(ctx,args){
  const expected=args.expectedUsername;
  const c=await connectLogin(ctx);
  try{
    if(!c.main)throw Error('Main page (dsh-app://app/) not present; targets='+JSON.stringify(c.pages.map(p=>p.url())));
    const page=c.main;
    const event=await ctx.recorder.read('主界面账号区','dsh-app://app/',{channel:'CDP DOM',scope:'home sidebar account area'},async()=>{
      const value=await page.evaluate((expected)=>{
        const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
        const brief=e=>{const r=e.getBoundingClientRect();return{tag:e.tagName.toLowerCase(),role:e.getAttribute('role'),cls:(e.className&&e.className.toString().slice(0,80))||'',text:(e.innerText||'').trim().slice(0,60),rect:{left:Math.round(r.left),top:Math.round(r.top),right:Math.round(r.right),bottom:Math.round(r.bottom),width:Math.round(r.width),height:Math.round(r.height)},html:e.outerHTML.slice(0,300)};};
        const vw=window.innerWidth,vh=window.innerHeight;
        const all=[...document.querySelectorAll('body *')].filter(vis);
        const matches=expected?all.filter(e=>(e.innerText||'').trim()===expected).map(brief):[];
        const bottomLeft=all.filter(e=>{const r=e.getBoundingClientRect();const t=(e.innerText||'').trim();return r.left<vw*0.35&&r.top>vh*0.6&&t.length>0&&t.length<=30;}).map(brief).slice(0,40);
        return {url:location.href,viewport:{width:vw,height:vh},body:document.body.innerText.slice(0,1200),matches,bottomLeft};
      },expected);
      return {value,raw:value};
    });
    return {mainUrl:event.value.url,viewport:event.value.viewport,exactMatches:event.value.matches,bottomLeftCandidates:event.value.bottomLeft,evidence_ref:event.event_id};
  }finally{await c.close();}
}
