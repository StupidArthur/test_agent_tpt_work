import {connectLogin} from '../automation/login-session.mjs';

// 只读：枚举登录页(welcome.html)的实际结构，供定位用。
export async function readLoginPage(ctx){
  const c=await connectLogin(ctx);
  try{
    if(!c.login)throw Error('Login page (welcome.html) not present; targets='+JSON.stringify(c.pages.map(p=>p.url())));
    const page=c.login;
    const event=await ctx.recorder.read('登录页','welcome.html',{channel:'CDP DOM',scope:'login page target'},async()=>{
      const value=await page.evaluate(()=>{
        const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
        const brief=e=>({tag:e.tagName.toLowerCase(),type:e.getAttribute('type'),role:e.getAttribute('role'),name:e.getAttribute('name'),id:e.id,placeholder:e.getAttribute('placeholder'),aria:e.getAttribute('aria-label'),text:(e.innerText||'').trim().slice(0,80),checked:(e.type==='checkbox'||e.getAttribute('role')==='checkbox')?!!e.checked:null,visible:vis(e),html:e.outerHTML.slice(0,500)});
        return {
          url:location.href,
          title:document.title,
          body:document.body.innerText.slice(0,5000),
          inputs:[...document.querySelectorAll('input')].map(brief),
          tabSelectors:[...document.querySelectorAll('[role="tab"],[role="tablist"] *,button')].filter(vis).map(brief),
          checkboxes:[...document.querySelectorAll('input[type="checkbox"],[role="checkbox"]')].map(brief),
          labels:[...document.querySelectorAll('label')].map(brief),
          buttons:[...document.querySelectorAll('button,[role="button"]')].filter(vis).map(brief),
          visibilityState:document.visibilityState
        };
      });
      return {value,raw:value};
    });
    return {loginUrl:event.value.url,body:event.value.body,controls:event.value,evidence_ref:event.event_id};
  }finally{await c.close();}
}
