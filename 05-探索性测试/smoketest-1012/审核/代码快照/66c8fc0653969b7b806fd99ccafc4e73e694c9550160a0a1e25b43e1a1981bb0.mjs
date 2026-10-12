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

// 只读：打开项目行的操作菜单并读取菜单项，随后 Escape 关闭。
export async function readProjectMenu(ctx,args){
  const name=args.name;
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    const row=page.locator('[data-row-key^="workspace:"]').filter({hasText:name});
    if(await row.count()!==1)throw Error('project row count='+await row.count());
    await row.first().scrollIntoViewIfNeeded();
    await row.first().hover();
    await page.waitForTimeout(600);
    const opt=row.first().locator('button[aria-label^="项目"][aria-label$="的操作"]');
    if(await opt.count()!==1)throw Error('project options button count='+await opt.count());
    const act=await ctx.recorder.action('打开项目操作菜单','click',{name},async()=>{await opt.first().click({timeout:5000});await page.waitForTimeout(900);});
    const event=await ctx.recorder.read('项目操作菜单','project-menu',{channel:'CDP DOM',scope:'project row action menu'},async()=>{
      const value=await page.evaluate(()=>{const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');return [...document.querySelectorAll('[role="menu"]')].filter(vis).map(m=>({text:(m.innerText||'').replace(/\s+/g,' ').slice(0,300),items:[...m.querySelectorAll('[role="menuitem"]')].map(e=>({text:(e.innerText||'').trim(),html:e.outerHTML.slice(0,200)}))}));});
      return {value,raw:value};
    });
    await page.keyboard.press('Escape');
    return {action_ref:act.event_id,menus:event.value,evidence_ref:event.event_id};
  }finally{await c.close();}
}

// 动作：移除项目（hover 项目行 → 操作菜单 → 移除项目 → 处理确认弹窗），并回读项目行列表。
export async function removeProject(ctx,args){
  const name=args.name;
  if(!name||typeof name!=='string')throw Error('name required');
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present');
    const readRows=()=>page.$$eval('[data-row-key^="workspace:"]',els=>els.map(e=>({key:e.getAttribute('data-row-key'),text:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,40)})));
    const before=await readRows();
    const row=page.locator('[data-row-key^="workspace:"]').filter({hasText:name});
    if(await row.count()!==1)throw Error('project row count='+await row.count());
    await row.first().scrollIntoViewIfNeeded();
    await row.first().hover();
    await page.waitForTimeout(600);
    await ctx.recorder.action('打开项目操作菜单','click',{name},async()=>{await row.first().locator('button[aria-label^="项目"][aria-label$="的操作"]').first().click({timeout:5000});await page.waitForTimeout(900);});
    const item=page.getByRole('menuitem',{name:'移除项目',exact:true});
    if(await item.count()!==1)throw Error('移除项目 menuitem count='+await item.count());
    const clickAct=await ctx.recorder.action('点击移除项目','click',{name},async()=>{await item.click({noWaitAfter:true});await page.waitForTimeout(1200);});
    const dialog=await page.evaluate(()=>{const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');const d=[...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].filter(vis);return d[0]?{text:(d[0].innerText||'').replace(/\s+/g,' ').slice(0,400),buttons:[...d[0].querySelectorAll('button')].filter(vis).map(b=>(b.innerText||'').trim()).filter(Boolean)}:null;});
    let confirmHandled=null;
    if(dialog){const bn=dialog.buttons.find(b=>/^(移除|删除|确定|确认|是|OK|Yes)$/i.test(b));if(bn){const btn=page.getByRole('button',{name:bn,exact:true});if(await btn.count()===1){await ctx.recorder.action('确认移除项目','click',{name:bn},async()=>{await btn.click({noWaitAfter:true});await page.waitForTimeout(2000);});confirmHandled=bn;}}}
    await page.waitForTimeout(1000);
    const after=await readRows();
    const event=await ctx.recorder.read('移除项目结果','remove-project',{channel:'CDP DOM',scope:'after removing project'},async()=>({value:{name,before,after,dialog,confirmHandled},raw:{before,after,dialog}}));
    return {name,action_ref:clickAct.event_id,before,after,dialog,confirmHandled,removed:!after.some(r=>r.text.includes(name)),evidence_ref:event.event_id};
  }finally{await c.close();}
}

// 动作：点击当前可见菜单中指定文本的菜单项，并回读项目按钮文本。
export async function clickMenuItem(ctx,args){
  const name=args.name;
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present');
    const menu=page.locator('[role="menu"]:visible').first();
    if(await menu.count()!==1)throw Error('visible menu count='+await menu.count());
    const menuText=(await menu.innerText()).replace(/\s+/g,' ').slice(0,300);
    const item=menu.getByRole('menuitem',{name,exact:true});
    const ic=await item.count();
    if(ic!==1)throw Error('menuitem "'+name+'" count='+ic);
    const act=await ctx.recorder.action('点击菜单项','click',{name},async()=>{await item.click({noWaitAfter:true});await page.waitForTimeout(1500);});
    const projectBtn=await page.locator('button[aria-label="选择项目"]').first().innerText().catch(()=>null);
    const event=await ctx.recorder.read('菜单项点击结果','menu-item',{channel:'CDP DOM',scope:'menu action'},async()=>({value:{name,menuText,projectButton:(projectBtn||'').replace(/\s+/g,' ').trim()},raw:{menuText,projectBtn}}));
    return {name,menuText,projectButton:event.value.projectButton,action_ref:act.event_id,evidence_ref:event.event_id};
  }finally{await c.close();}
}
export async function clickDialogButton(ctx,args){
  const name=args.name;
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present');
    const dlg=page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').first();
    const cnt=await dlg.count();
    if(cnt!==1)throw Error('visible dialog count='+cnt);
    const dtext=(await dlg.innerText()).replace(/\s+/g,' ').slice(0,400);
    const btn=dlg.getByRole('button',{name,exact:true});
    const bc=await btn.count();
    if(bc!==1)throw Error('dialog button "'+name+'" count='+bc);
    const act=await ctx.recorder.action('点击弹窗按钮','click',{name},async()=>{await btn.click({noWaitAfter:true});await page.waitForTimeout(1500);});
    const rows=await page.$$eval('[data-row-key^="workspace:"]',els=>els.map(e=>(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,40)));
    const event=await ctx.recorder.read('弹窗按钮点击结果','dialog-button',{channel:'CDP DOM',scope:'dialog action'},async()=>({value:{name,dialogText:dtext,workspaceRowsAfter:rows},raw:{dtext,rows}}));
    return {name,dialogText:dtext,workspaceRowsAfter:rows,action_ref:act.event_id,evidence_ref:event.event_id};
  }finally{await c.close();}
}
