import {connectLogin} from '../automation/login-session.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const readSession=page=>page.evaluate(()=>document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session')||null);

// 动作：点击左上角“新建任务”，读取切换前后会话身份与 composer 状态。
export async function newTask(ctx){
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present; targets='+JSON.stringify(c.pages.map(p=>p.url())));
    const before=await readSession(page);
    const btn=page.locator('button[aria-label="新建任务"]');
    const count=await btn.count();
    if(count!==1)throw Error('新建任务 button count='+count);
    const act=await ctx.recorder.action('新建任务','click',{selector:'button[aria-label="新建任务"]'},async()=>{await btn.click({timeout:5000});await page.waitForTimeout(1800);});
    const after=await readSession(page);
    const composer=await page.evaluate(()=>{const e=document.querySelector('[contenteditable="true"]');return e?{aria:e.getAttribute('aria-label'),visible:!!e.getClientRects().length}:null;});
    const body=(await page.locator('body').innerText()).slice(0,400);
    const event=await ctx.recorder.read('新建任务结果','new-task',{channel:'CDP DOM',scope:'after clicking 新建任务'},async()=>({value:{sessionBefore:before,sessionAfter:after,composer,body},raw:{before,after,composer}}));
    return {action_ref:act.event_id,sessionBefore:before,sessionAfter:after,composer,bodySnippet:event.value.body,evidence_ref:event.event_id};
  }finally{await c.close();}
}

// 动作：在左侧列表中切换到指定会话名，读取切换前后会话身份。
export async function switchSession(ctx,args){
  const name=args.name;
  if(!name||typeof name!=='string')throw Error('name required');
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present');
    const before=await readSession(page);
    const target=page.getByText(name,{exact:true});
    const total=await target.count();
    if(total<1)throw Error('Session text not found: '+name);
    let idx=-1;
    for(let i=0;i<total;i++){if(await target.nth(i).isVisible()){idx=i;break;}}
    if(idx<0)throw Error('No visible element for session: '+name);
    const clickInfo=await target.nth(idx).evaluate(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName.toLowerCase(),cls:(e.className||'').toString().slice(0,80),rect:{left:Math.round(r.left),top:Math.round(r.top),width:Math.round(r.width),height:Math.round(r.height)}};});
    const act=await ctx.recorder.action('切换会话','click',{name,matchedElements:total,clickedIndex:idx,clickInfo},async()=>{await target.nth(idx).click({timeout:5000});await page.waitForTimeout(1800);});
    const after=await readSession(page);
    const header=(await page.locator('body').innerText()).slice(0,300);
    const event=await ctx.recorder.read('切换会话结果','switch-session',{channel:'CDP DOM',scope:'after clicking sidebar session'},async()=>({value:{name,before,after,changed:before!==after,clickInfo,header},raw:{before,after,clickInfo}}));
    return {action_ref:act.event_id,name,sessionBefore:before,sessionAfter:after,changed:before!==after,clickInfo,headerSnippet:event.value.header,evidence_ref:event.event_id};
  }finally{await c.close();}
}
