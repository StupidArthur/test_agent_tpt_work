import {connectLogin} from '../automation/login-session.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// 动作：点击 composer 旁的“选择项目”，读取点击后 DOM 是否出现菜单/对话框（原生窗口另行探测）。
export async function clickSelectProject(ctx){  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present');
    const btn=page.locator('button[aria-label="选择项目"]');
    const count=await btn.count();
    if(count!==1)throw Error('选择项目 button count='+count);
    const before=await btn.getAttribute('aria-expanded');
    const act=await ctx.recorder.action('选择项目','click',{selector:'button[aria-label="选择项目"]'},async()=>{await btn.click({timeout:5000,noWaitAfter:true}).catch(e=>{throw e;});await page.waitForTimeout(1800);});
    const after=await btn.getAttribute('aria-expanded');
    const dom=await page.evaluate(()=>{
      const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
      const menus=[...document.querySelectorAll('[role="menu"]')].filter(vis).map(m=>({text:(m.innerText||'').replace(/\s+/g,' ').slice(0,200),items:[...m.querySelectorAll('[role="menuitem"]')].map(e=>(e.innerText||'').trim())}));
      const dialogs=[...document.querySelectorAll('[role="dialog"]')].filter(vis).map(d=>(d.innerText||'').replace(/\s+/g,' ').slice(0,300));
      return {menus,dialogs};
    });
    const event=await ctx.recorder.read('选择项目点击后DOM','select-project',{channel:'CDP DOM',scope:'after clicking 选择项目'},async()=>({value:{before,after,dom},raw:{before,after,dom}}));
    return {action_ref:act.event_id,before,after,menus:dom.menus,dialogs:dom.dialogs,evidence_ref:event.event_id};
  }finally{await c.close();}
}

// 只读：hover 项目行并列出其按钮与结构（用于定位移除入口），不点击。
export async function readProjectRow(ctx,args){
  const name=args.name;
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present');
    const rows=page.locator('[data-row-key^="workspace:"]');
    const rc=await rows.count();
    const row=name?rows.filter({hasText:name}):rows;
    const count=await row.count();
    if(count!==1)throw Error('project row count='+count+' (total '+rc+')');
    await row.first().scrollIntoViewIfNeeded();
    await row.first().hover();
    await page.waitForTimeout(600);
    const event=await ctx.recorder.read('项目行控件','project-row',{channel:'CDP DOM',scope:'sidebar project row (hovered)'},async()=>{
      const value=await row.first().evaluate(r=>{
        const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
        return {text:(r.innerText||'').replace(/\s+/g,' ').trim().slice(0,80),html:r.outerHTML.slice(0,1800),buttons:[...r.querySelectorAll('button')].map(b=>({aria:b.getAttribute('aria-label'),text:(b.innerText||'').trim(),visible:vis(b),html:b.outerHTML.slice(0,300)}))};
      });
      return {value,raw:value};
    });
    return {rowText:event.value.text,rowHtml:event.value.html,buttons:event.value.buttons,evidence_ref:event.event_id};
  }finally{await c.close();}
}
