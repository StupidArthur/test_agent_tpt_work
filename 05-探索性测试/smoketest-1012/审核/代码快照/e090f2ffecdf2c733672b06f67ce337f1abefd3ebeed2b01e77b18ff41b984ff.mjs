import {connectLogin} from '../automation/login-session.mjs';

// 只读：探测主界面当前可见控件（按钮 aria-label / 文本、composer、会话身份），供定位用。
export async function probeControls(ctx){
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present; targets='+JSON.stringify(c.pages.map(p=>p.url())));
    const event=await ctx.recorder.read('主界面可见控件','controls',{channel:'CDP DOM',scope:'current main page'},async()=>{
      const value=await page.evaluate(()=>{
        const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
        const buttons=[...document.querySelectorAll('button')].filter(vis).map(e=>({aria:e.getAttribute('aria-label'),text:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,40),cls:(e.className||'').toString().split(' ')[0]}));
        const composer=[...document.querySelectorAll('[contenteditable="true"]')].map(e=>({aria:e.getAttribute('aria-label'),visible:vis(e),cls:(e.className||'').toString().slice(0,60)}));
        const modelish=buttons.filter(b=>(b.aria||'').includes('模型'));
        const session=document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session')||null;
        return {url:location.href,session,buttons,buttonsWithAria:buttons.filter(b=>b.aria),composer,modelish,body:document.body.innerText.slice(0,900)};
      });
      return {value,raw:value};
    });
    return {url:event.value.url,session:event.value.session,buttonsWithAria:event.value.buttonsWithAria,composer:event.value.composer,modelish:event.value.modelish,body:event.value.body,evidence_ref:event.event_id};
  }finally{await c.close();}
}

// 只读：探测左侧列表结构（data-row-key、role 行、文本），用于定位自动生成的对话名。
export async function probeSidebar(ctx){
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present; targets='+JSON.stringify(c.pages.map(p=>p.url())));
    const event=await ctx.recorder.read('侧栏列表结构','sidebar',{channel:'CDP DOM',scope:'left sidebar list'},async()=>{
      const value=await page.evaluate(()=>{
        const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
        const rowKeys=[...document.querySelectorAll('[data-row-key]')].map(e=>({key:e.getAttribute('data-row-key'),text:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,60),visible:vis(e)}));
        const roleRows=[...document.querySelectorAll('[role="treeitem"],[role="listitem"],[role="option"]')].filter(vis).map(e=>({role:e.getAttribute('role'),text:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,60)}));
        const nav=[...document.querySelectorAll('nav,aside,[class*="sidebar"],[class*="Sidebar"]')].filter(vis).map(e=>(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,600));
        const side=[...document.querySelectorAll('nav,aside,[class*="sidebar"],[class*="Sidebar"]')].filter(vis).find(e=>/最近/.test(e.innerText||''));
        return {rowKeys,roleRows,navTexts:nav,sidebarHtml:side?side.outerHTML.slice(0,7000):null,body:document.body.innerText.slice(0,1200)};
      });
      return {value,raw:value};
    });
    return {rowKeys:event.value.rowKeys,roleRows:event.value.roleRows,navTexts:event.value.navTexts,sidebarHtml:event.value.sidebarHtml,body:event.value.body,evidence_ref:event.event_id};
  }finally{await c.close();}
}
