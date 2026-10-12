import {connectLogin} from '../automation/login-session.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const pageUrls=browser=>browser.contexts().flatMap(c=>c.pages()).map(p=>p.url());
const findWelcome=browser=>browser.contexts().flatMap(c=>c.pages()).find(p=>/welcome\.html/i.test(p.url()))||null;
const visibleDialog=page=>page.evaluate(()=>{
  const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
  const d=[...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].filter(vis).map(e=>({text:(e.innerText||'').slice(0,400),buttons:[...e.querySelectorAll('button')].filter(vis).map(b=>(b.innerText||'').trim()).filter(Boolean)}));
  return d[0]||null;
}).catch(()=>null);

// 动作：点击左下角账号菜单中的“退出登录”，并读取退出后的真实页面状态（登录页是否出现）。
export async function logout(ctx,args={}){
  const timeout=args.timeoutMs??20000;
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present; cannot log out; targets='+JSON.stringify(pageUrls(c.browser)));
    const triggers=page.locator('[data-slot="settings.user"] button[aria-haspopup="menu"]');
    const count=await triggers.count();
    if(count!==1)throw Error('Account trigger count='+count);
    const openRef=await ctx.recorder.action('主界面账号菜单','open',{selector:'[data-slot="settings.user"] button[aria-haspopup="menu"]'},async()=>{await triggers.first().click({timeout:5000});});
    await page.locator('[role="menu"]').first().waitFor({state:'visible',timeout:5000});
    const item=page.getByRole('menuitem',{name:'退出登录',exact:true});
    const itemCount=await item.count();
    if(itemCount!==1)throw Error('退出登录 menuitem count='+itemCount);
    const clickRef=await ctx.recorder.action('账号菜单','click',{name:'退出登录'},async()=>{await item.click({noWaitAfter:true});});

    const deadline=Date.now()+timeout;let outcome={},dialog=null,confirmHandled=null,loginUrl=null;
    while(Date.now()<deadline){
      const welcome=findWelcome(c.browser);
      if(welcome){outcome={kind:'loginPageAppeared'};loginUrl=welcome.url();break;}
      if(page.isClosed()){outcome={kind:'mainPageClosed'};break;}
      dialog=await visibleDialog(page);
      if(dialog){outcome={kind:'dialog',dialog};break;}
      await sleep(300);
    }
    if(outcome.kind==='dialog'&&outcome.dialog){
      const name=outcome.dialog.buttons.find(b=>/^(确定|确认|退出|退出登录|是|OK|Yes)$/i.test(b));
      if(name){
        const btn=page.getByRole('button',{name,exact:true});
        if(await btn.count()===1){
          await ctx.recorder.action('退出确认弹窗','confirm',{name},async()=>{await btn.click({noWaitAfter:true});});
          confirmHandled=name;
          const d2=Date.now()+timeout;
          while(Date.now()<d2){const w=findWelcome(c.browser);if(w){loginUrl=w.url();outcome={kind:'confirmedThenLoginPage'};break;}if(page.isClosed()){outcome={kind:'confirmedThenMainClosed'};break;}await sleep(300);}
        }
      }
    }
    const loginPage=findWelcome(c.browser);
    const result={open_ref:openRef.event_id,click_ref:clickRef.event_id,outcome,dialog:outcome.dialog||dialog,confirmHandled,loginPageAppeared:!!loginPage,loginUrl:loginPage?loginPage.url():null,mainPageClosed:page.isClosed(),pageUrlsAfter:pageUrls(c.browser)};
    const event=await ctx.recorder.read('退出登录结果','logout-flow',{channel:'CDP DOM',scope:'post-logout actual page state'},async()=>({value:result,raw:result}));
    return {...result,evidence_ref:event.event_id};
  }finally{await c.close();}
}

// 只读：打开主界面左下角账号菜单并读取菜单项，随后按 Escape 关闭（不点击任何菜单项）。
export async function readAccountMenu(ctx){
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present; targets='+JSON.stringify(c.pages.map(p=>p.url())));
    const triggers=page.locator('[data-slot="settings.user"] button[aria-haspopup="menu"]');
    const count=await triggers.count();
    if(count!==1)throw Error('Account trigger count='+count);
    const trigger=triggers.first();
    const before=await trigger.getAttribute('aria-expanded');
    const openRef=await ctx.recorder.action('主界面账号菜单','open',{selector:'[data-slot="settings.user"] button[aria-haspopup="menu"]'},async()=>{await trigger.click({timeout:5000});});
    await page.locator('[role="menu"]').first().waitFor({state:'visible',timeout:5000}).catch(()=>{});
    await sleep(300);
    const readEvent=await ctx.recorder.read('账号菜单','account-menu',{channel:'CDP DOM',scope:'sidebar user menu while open'},async()=>{
      const value=await page.evaluate(()=>{
        const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
        const menus=[...document.querySelectorAll('[role="menu"]')].filter(vis).map(m=>({
          html:m.outerHTML.slice(0,4000),
          items:[...m.querySelectorAll('[role="menuitem"],[role="menuitemradio"],[role="menuitemcheckbox"],button,a')].filter(vis).map(e=>({role:e.getAttribute('role')||e.tagName.toLowerCase(),text:(e.innerText||'').trim().slice(0,60),aria:e.getAttribute('aria-label'),html:e.outerHTML.slice(0,300)}))
        }));
        return {expanded:document.querySelector('[data-slot="settings.user"] button[aria-haspopup="menu"]')?.getAttribute('aria-expanded'),menuCount:menus.length,menus};
      });
      return {value,raw:value};
    });
    await ctx.recorder.action('主界面账号菜单','close',{key:'Escape'},async()=>{await page.keyboard.press('Escape');});
    await sleep(200);
    const after=await trigger.getAttribute('aria-expanded');
    return {before,after,expandedWhileOpen:readEvent.value.expanded,menuCount:readEvent.value.menuCount,menus:readEvent.value.menus,open_ref:openRef.event_id,evidence_ref:readEvent.event_id};
  }finally{await c.close();}
}
