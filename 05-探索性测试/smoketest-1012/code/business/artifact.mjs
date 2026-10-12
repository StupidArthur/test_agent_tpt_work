import {connectLogin} from '../automation/login-session.mjs';

// 动作：点击会话中的产物文件链接（button._fileLink_），读取随后右侧显示页的真实状态。
export async function openArtifactLink(ctx,args){
  const name=args.name;
  if(!name||typeof name!=='string')throw Error('name required');
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present');
    const btns=page.locator('button[class*="_fileLink_"]');
    const n=await btns.count();
    const texts=[];
    for(let i=0;i<n;i++)texts.push((await btns.nth(i).innerText()).trim());
    const idx=texts.indexOf(name);
    if(idx<0)throw Error('file link not found: '+name+' ; have '+JSON.stringify([...new Set(texts)]));
    const act=await ctx.recorder.action('点击产物链接','click',{name},async()=>{await btns.nth(idx).click({timeout:5000});await page.waitForTimeout(3000);});
    const event=await ctx.recorder.read('右侧显示页','side-panel',{channel:'CDP DOM',scope:'after opening artifact link'},async()=>{
      const value=await page.evaluate(()=>{
        const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
        const rc=e=>{const r=e.getBoundingClientRect();return{l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};};
        const iframes=[...document.querySelectorAll('iframe,webview')].filter(vis).map(e=>({tag:e.tagName.toLowerCase(),src:e.getAttribute('src'),rect:rc(e)}));
        const panels=[...document.querySelectorAll('[class*="browser"],[class*="Browser"],[class*="preview"],[class*="Preview"],[class*="viewer"],[class*="Viewer"],[class*="sidePanel"],[class*="side-panel"],[class*="presented"],[role="complementary"]')].filter(vis).map(e=>({cls:(e.className||'').toString().slice(0,80),text:(e.innerText||'').replace(/\s+/g,' ').slice(0,400),rect:rc(e)}));
        const rightEls=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return vis(e)&&r.left>window.innerWidth*0.6&&e.children.length===0&&(e.innerText||'').trim();}).slice(0,25).map(e=>(e.innerText||'').trim().slice(0,70));
        return {iframes,panels,rightEls,viewport:{w:window.innerWidth,h:window.innerHeight},bodySnippet:document.body.innerText.slice(0,800)};
      });
      return {value,raw:value};
    });
    return {name,index:idx,available:[...new Set(texts)],iframes:event.value.iframes,panels:event.value.panels,rightEls:event.value.rightEls,viewport:event.value.viewport,action_ref:act.event_id,evidence_ref:event.event_id};
  }finally{await c.close();}
}

// 只读：读取当前右侧显示页状态（不点击）。
export async function readSidePanel(ctx){
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present');
    const event=await ctx.recorder.read('右侧显示页(当前)','side-panel-current',{channel:'CDP DOM',scope:'current side panel'},async()=>{
      const value=await page.evaluate(()=>{
        const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
        const rc=e=>{const r=e.getBoundingClientRect();return{l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};};
        const iframes=[...document.querySelectorAll('iframe,webview')].filter(vis).map(e=>({tag:e.tagName.toLowerCase(),src:e.getAttribute('src'),rect:rc(e)}));
        const panels=[...document.querySelectorAll('[class*="browser"],[class*="Browser"],[class*="preview"],[class*="Preview"],[class*="viewer"],[class*="Viewer"],[class*="sidePanel"],[class*="side-panel"],[role="complementary"]')].filter(vis).map(e=>({cls:(e.className||'').toString().slice(0,80),text:(e.innerText||'').replace(/\s+/g,' ').slice(0,400),rect:rc(e)}));
        return {iframes,panels};
      });
      return {value,raw:value};
    });
    return {iframes:event.value.iframes,panels:event.value.panels,evidence_ref:event.event_id};
  }finally{await c.close();}
}
