import {connectLogin} from '../automation/login-session.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

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
