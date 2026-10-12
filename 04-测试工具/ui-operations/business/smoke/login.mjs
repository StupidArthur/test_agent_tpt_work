import fs from 'node:fs';
import {connectLogin} from '../../automation/login-session.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// 只读：枚举登录页(welcome.html)的实际结构，供定位用。
export async function readLoginPage(ctx){
  const c=await connectLogin(ctx);
  try{
    if(!c.login)throw Error('Login page (welcome.html) not present; targets='+JSON.stringify(c.pages.map(p=>p.url())));
    const page=c.login;
    const event=await ctx.recorder.read('登录页','welcome.html',{channel:'CDP DOM',scope:'login page target'},async()=>{
      const value=await page.evaluate(()=>{
        const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
        const brief=e=>({tag:e.tagName.toLowerCase(),type:e.getAttribute('type'),role:e.getAttribute('role'),name:e.getAttribute('name'),id:e.id,placeholder:e.getAttribute('placeholder'),aria:e.getAttribute('aria-label'),text:(e.innerText||'').trim().slice(0,80),checked:(e.type==='checkbox'||e.getAttribute('role')==='checkbox')?!!e.checked:null,visible:vis(e),html:(()=>{const clone=e.cloneNode(true);if(clone.matches('input'))clone.removeAttribute('value');clone.querySelectorAll('input').forEach(x=>x.removeAttribute('value'));return clone.outerHTML.slice(0,500);})()});
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

// 动作：在登录页执行 账号密码登录 流程并读取真实结果。
// 凭据从 credentialsPath 读取，不写入本函数返回或动作日志（只回传 username 与密码长度）。
export async function loginWithPassword(ctx,args){
  const creds=JSON.parse(fs.readFileSync(args.credentialsPath,'utf8'));
  if(!creds||typeof creds.username!=='string'||typeof creds.password!=='string'||!creds.username||!creds.password)throw Error('credentials file requires nonempty username and password');
  const remember=!!args.rememberPassword, agree=!!args.agreeTerms, timeout=args.timeoutMs??20000;
  const c=await connectLogin(ctx);
  try{
    const page=c.login;
    if(!page)throw Error('Login page (welcome.html) not present; targets='+JSON.stringify(c.pages.map(p=>p.url())));
    if(args.expectedLoginUrl&&!page.url().startsWith(args.expectedLoginUrl))throw Error('Login page URL mismatch: '+page.url());
    const tab=page.locator('#login-tab-password'), username=page.locator('#login-username-input'),
      password=page.locator('#login-password-input'), rememberBox=page.locator('#login-remember'),
      agreeBox=page.locator('#login-agreement-check'), submit=page.locator('#login-password-submit');
    const state=async()=>({loginUrl:page.url(),tabSelected:await tab.getAttribute('aria-selected'),
      usernameValue:await username.inputValue(),passwordLength:(await password.inputValue()).length,
      rememberChecked:await rememberBox.isChecked(),agreementChecked:await agreeBox.isChecked(),
      submitDisabled:await submit.isDisabled()});
    const readMain=async()=>{try{return c.main&&!c.main.isClosed()?{url:c.main.url(),body:(await c.main.locator('body').innerText()).slice(0,1500),visibility:await c.main.evaluate(()=>document.visibilityState)}:null;}catch(e){return {error:e.message};}};
    const messages=async()=>{try{return page.isClosed()?[]:await page.evaluate(()=>{
      const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
      return [...document.querySelectorAll('[role="alert"],[class*="error"],[class*="toast"]')].filter(vis).map(e=>(e.innerText||'').trim()).filter(Boolean);
    });}catch(e){return [];}};

    const before=await state();
    const mainBefore=await readMain();
    const preMessages=await messages();
    await ctx.recorder.action('登录页','selectPasswordTab',{},async()=>{if(await tab.getAttribute('aria-selected')!=='true')await tab.click();});
    await ctx.recorder.action('登录页','fillUsername',{username:creds.username},async()=>{await username.fill(creds.username);});
    await ctx.recorder.action('登录页','fillPassword',{password:'***'},async()=>{await password.fill(creds.password);});
    await ctx.recorder.action('登录页','setRemember',{value:remember},async()=>{if(remember!==await rememberBox.isChecked())await rememberBox.setChecked(remember);});
    await ctx.recorder.action('登录页','setAgreement',{value:agree},async()=>{if(agree!==await agreeBox.isChecked())await agreeBox.setChecked(agree);});
    const armed=await state();
    const armDeadline=Date.now()+5000;
    while(await submit.isDisabled()&&Date.now()<armDeadline)await sleep(100);
    if(await submit.isDisabled())throw Error('Submit still disabled after filling; not clicking');
    await ctx.recorder.action('登录页','submitLogin',{},async()=>{await submit.click({noWaitAfter:true});});

    const deadline=Date.now()+timeout;let outcome={},samples=[];
    while(Date.now()<deadline){
      if(page.isClosed()){outcome={kind:'loginPageClosed'};break;}
      const loginVisibility=await page.evaluate(()=>document.visibilityState).catch(()=>'unknown');
      const newMessages=(await messages()).filter(x=>!preMessages.includes(x));
      samples.push({elapsedMs:Date.now()-(deadline-timeout),loginVisibility,newMessages});
      if(newMessages.length){outcome={kind:'messages',messages:newMessages};break;}
      await sleep(400);
    }
    await sleep(600);
    const loginVisibility=page.isClosed()?'closed':await page.evaluate(()=>document.visibilityState).catch(()=>'unknown');
    const mainAfter=await readMain();
    const result={username:creds.username,passwordLength:creds.password.length,before,armed,outcome,loginPageClosed:page.isClosed(),loginVisibility,preMessages,samples:samples.slice(-6),mainBefore,mainAfter};
    const event=await ctx.recorder.read('登录结果','login-flow',{channel:'CDP DOM',scope:'post-submit actual state'},async()=>({value:result,raw:result}));
    return {...result,evidence_ref:event.event_id};
  }finally{await c.close();}
}
