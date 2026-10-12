import {connectLogin} from '../automation/login-session.mjs';
import {ensureConversationView,runningIndicatorCount} from '../../../../04-测试工具/ui-operations/automation/conversation.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function readApproval(page){
  return page.evaluate(()=>{
    const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
    const btns=[...document.querySelectorAll('button,[role="button"]')].filter(vis).filter(e=>/^(允许一次|不允许|允许|拒绝)$/.test((e.innerText||'').trim()));
    if(!btns.length)return null;
    let container=btns[0].closest('[role="dialog"],[class*="pproval"],[class*="ermission"]');
    if(!container){let p=btns[0];for(let i=0;i<8&&p;i++){p=p.parentElement;if(p&&/[权限|审批|访问]/.test(p.innerText||'')){container=p;break;}}}
    return {buttons:btns.map(b=>(b.innerText||'').trim()),text:container?(container.innerText||'').replace(/\s+/g,' ').slice(0,600):null};
  }).catch(()=>null);
}
async function snapshot(page){
  const running=await runningIndicatorCount(page);
  const stop=await page.getByRole('button',{name:/停止/}).count().catch(()=>0);
  const replies=await page.locator('[class*="hWmORq_body"]').allInnerTexts();
  return {running,stop,replyCount:replies.length,lastReply:replies.length?replies[replies.length-1]:null,replies};
}

// 动作：填入并发送消息，轮询等待“权限审批弹窗出现”或“对话空闲（终态）”。
export async function sendAwait(ctx,args){
  const text=args.text, timeoutMs=args.timeoutMs??120000;
  if(typeof text!=='string'||!text.length)throw Error('text required');
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present');
    await ensureConversationView(page);
    const composer=page.locator('div[contenteditable="true"][aria-label*="/ 调用指令"]').first();
    const preCount=await page.locator('[class*="hWmORq_body"]').count();
    const act=await ctx.recorder.action('composer 发送消息','fill-and-send',{chars:text.length},async()=>{
      await composer.click();await composer.fill(text);await page.waitForTimeout(400);
      await page.locator('button[aria-label="发送消息"]').first().click();
    });
    const deadline=Date.now()+timeoutMs;let approval=null,kind=null,snap=null;
    await sleep(1500);
    while(Date.now()<deadline){
      approval=await readApproval(page);
      if(approval){kind='approval';break;}
      snap=await snapshot(page);
      if(snap.running===0&&snap.stop===0&&snap.replyCount>preCount){kind='idle';break;}
      await sleep(500);
    }
    const event=await ctx.recorder.read('发送与等待结果','send-await',{channel:'CDP DOM',scope:'approval or idle'},async()=>({value:{kind,approval,snapshot:snap&&{running:snap.running,stop:snap.stop,replyCount:snap.replyCount,lastReply:snap.lastReply}},raw:{kind,approval,snapshot:snap}}));
    return {action_ref:act.event_id,kind,approval,snapshot:snap&&{running:snap.running,stop:snap.stop,replyCount:snap.replyCount,lastReply:snap.lastReply},evidence_ref:event.event_id};
  }finally{await c.close();}
}

// 动作：在权限审批弹窗中点击指定名称的按钮（如 不允许 / 允许一次）。
export async function clickApproval(ctx,args){
  const label=args.label;
  if(!label)throw Error('label required');
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    const before=await readApproval(page);
    if(!before)throw Error('no approval dialog visible');
    const btn=page.getByRole('button',{name:label,exact:true});
    const cnt=await btn.count();
    if(cnt!==1)throw Error('approval button "'+label+'" count='+cnt);
    const act=await ctx.recorder.action('权限审批','click',{label,available:before.buttons},async()=>{await btn.click({noWaitAfter:true});await page.waitForTimeout(1500);});
    const after=await readApproval(page);
    const event=await ctx.recorder.read('权限审批结果','approval-click',{channel:'CDP DOM',scope:'approval dialog'},async()=>({value:{label,before,stillVisible:!!after},raw:{label,before,after}}));
    return {label,before,buttons:before.buttons,stillVisible:!!after,action_ref:act.event_id,evidence_ref:event.event_id};
  }finally{await c.close();}
}

// 只读：等待当前对话空闲（终态）并回读最终助手正文。
export async function waitIdle(ctx,args){
  const timeoutMs=args.timeoutMs??120000;
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    const deadline=Date.now()+timeoutMs;let snap=null,idle=false;
    while(Date.now()<deadline){
      snap=await snapshot(page);
      if(snap.running===0&&snap.stop===0&&snap.replyCount>0){idle=true;break;}
      await sleep(500);
    }
    const event=await ctx.recorder.read('对话空闲状态','wait-idle',{channel:'CDP DOM',scope:'conversation idle'},async()=>({value:{idle,lastReply:snap&&snap.lastReply},raw:snap&&{running:snap.running,stop:snap.stop,replyCount:snap.replyCount}}));
    return {idle,lastReply:snap&&snap.lastReply,running:snap&&snap.running,stop:snap&&snap.stop,replyCount:snap&&snap.replyCount,evidence_ref:event.event_id};
  }finally{await c.close();}
}

// 动作：点击当前可见、文本精确匹配的按钮，并回读审批弹窗与对话状态。
export async function clickExactButton(ctx,args){
  const name=args.name;
  if(!name)throw Error('name required');
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present');
    const btn=page.getByRole('button',{name,exact:true});
    const cnt=await btn.count();
    if(cnt!==1)throw Error('button "'+name+'" count='+cnt);
    const act=await ctx.recorder.action('点击按钮','click',{name},async()=>{await btn.click({noWaitAfter:true});await page.waitForTimeout(1500);});
    const approval=await readApproval(page);
    const snap=await snapshot(page);
    const event=await ctx.recorder.read('点击按钮结果','click-button',{channel:'CDP DOM',scope:'after clicking exact button'},async()=>({value:{name,approval,snapshot:{running:snap.running,stop:snap.stop,replyCount:snap.replyCount,lastReply:snap.lastReply}},raw:{name,approval}}));
    return {name,approval,snapshot:{running:snap.running,stop:snap.stop,replyCount:snap.replyCount,lastReply:snap.lastReply},action_ref:act.event_id,evidence_ref:event.event_id};
  }finally{await c.close();}
}

// 动作：点击当前可见、文本包含指定片段的按钮（用于问题卡选项），并回读审批/对话状态。
export async function clickButtonContaining(ctx,args){
  const text=args.text;
  if(!text)throw Error('text required');
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present');
    const btns=page.locator('button,[role="button"]');
    const n=await btns.count();let idx=-1;
    for(let i=0;i<n;i++){const t=(await btns.nth(i).innerText().catch(()=>''))||'';const vis=await btns.nth(i).isVisible().catch(()=>false);if(vis&&t.includes(text)){idx=i;break;}}
    if(idx<0)throw Error('no visible button containing "'+text+'"');
    const label=((await btns.nth(idx).innerText())||'').replace(/\s+/g,' ').trim().slice(0,100);
    const act=await ctx.recorder.action('点击按钮(含文本)','click',{text,label},async()=>{await btns.nth(idx).click({noWaitAfter:true});await page.waitForTimeout(1500);});
    const approval=await readApproval(page);
    const snap=await snapshot(page);
    const event=await ctx.recorder.read('点击按钮结果','click-button-containing',{channel:'CDP DOM',scope:'after clicking button by contains'},async()=>({value:{text,label,approval,snapshot:{running:snap.running,stop:snap.stop,replyCount:snap.replyCount,lastReply:snap.lastReply}},raw:{text,label,approval}}));
    return {text,label,approval,snapshot:{running:snap.running,stop:snap.stop,replyCount:snap.replyCount,lastReply:snap.lastReply},action_ref:act.event_id,evidence_ref:event.event_id};
  }finally{await c.close();}
}

// 只读：读取当前权限审批弹窗文本与按钮（不点击）。
export async function readApprovalDialog(ctx){
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    const approval=await readApproval(page);
    const event=await ctx.recorder.read('权限审批弹窗','approval',{channel:'CDP DOM',scope:'approval dialog'},async()=>({value:approval,raw:approval}));
    return {approval,evidence_ref:event.event_id};
  }finally{await c.close();}
}

// 只读：读取当前“问题卡片”（ask-user）的结构，用于定位提交按钮。
export async function readQuestionCard(ctx){
  const c=await connectLogin(ctx);
  try{
    const page=c.main;
    if(!page)throw Error('Main page (dsh-app://app/) not present');
    const event=await ctx.recorder.read('问题卡片','question-card',{channel:'CDP DOM',scope:'ask-user question card'},async()=>{
      const value=await page.evaluate(()=>{
        const vis=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
        const btns=[...document.querySelectorAll('button,[role="button"]')].filter(vis).filter(e=>((e.innerText||'')+(e.getAttribute('aria-label')||'')).includes('重新授权一次写入'));
        if(!btns.length)return {found:false};
        let card=btns[0];
        for(let i=0;i<12&&card;i++){if(/放弃整组问题|上一题|下一题/.test(card.innerText||''))break;card=card.parentElement;}
        return {found:true,html:(card||btns[0]).outerHTML.slice(0,8000),text:(card||btns[0]).innerText.slice(0,900)};
      });
      return {value,raw:value};
    });
    return event.value;
  }finally{await c.close();}
}
