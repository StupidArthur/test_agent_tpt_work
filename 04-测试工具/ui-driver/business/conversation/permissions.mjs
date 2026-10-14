import {connect} from '../../automation/session.mjs';
const trigger='button[aria-label^="访问模式，当前："]';
const fullModes=new Set(['完全权限','全部允许']);
export async function readTaskPermissionOptions(ctx){const c=await connect(ctx);try{const before=await ctx.recorder.read('当前任务访问模式','task-permission',{channel:'dom',scope:'当前任务编辑器'},async()=>({value:await c.page.locator(trigger).innerText(),raw:{session:await c.page.locator('[data-conversation-session]').getAttribute('data-conversation-session')}}));const act=await ctx.recorder.action('展开任务访问模式选项','click',null,async()=>{await c.page.locator(trigger).click();});const options=await ctx.recorder.read('任务访问模式菜单原文','task-permission-options',{channel:'dom',scope:'可见访问模式菜单'},async()=>{const menus=await c.page.locator('[role="menu"]:visible,[role="listbox"]:visible').evaluateAll(els=>els.map(e=>({text:e.innerText,html:e.outerHTML})));if(!menus.length)throw Error('Task permission menu not found');return {value:menus,raw:{menus}};});await c.page.keyboard.press('Escape');return {action_refs:[act.event_id],observations:{before,options}};}finally{await c.close();}}
export async function setTaskPermission(ctx,args){
 if(fullModes.has(args.value)&&args.confirmFullPermission!==true)throw Error('Full permission requires explicit confirmFullPermission=true for the authorized task');
 const c=await connect(ctx);
 try{
  const button=c.page.locator(trigger);
  const before=await ctx.recorder.read('任务权限修改前','task-permission',{channel:'dom',scope:'当前任务'},async()=>({value:(await button.innerText()).trim()}));
  const act=await ctx.recorder.action('选择当前任务访问模式','click',{value:args.value},async()=>{
   if(before.value===args.value)return;
   // Do not approve an unrelated pre-existing confirmation.
   if(await c.page.locator('[role="dialog"]:visible').count())throw Error('Pre-existing dialog; task permission unchanged');
   if(await button.count()!==1||!await button.isEnabled())throw Error('Current task permission control missing, ambiguous or disabled');
   await button.click();
   const menu=c.page.locator('[role="menu"]:visible,[role="listbox"]:visible');
   const option=menu.getByText(args.value,{exact:true});
   if(await option.count()!==1)throw Error('Task permission option absent or ambiguous');
   await option.click();
   if(fullModes.has(args.value)){
    const dlg=c.page.getByRole('dialog',{name:`确认启用${args.value}？`,exact:true});
    await dlg.waitFor({state:'visible'});
    const read=await ctx.recorder.read('任务权限风险确认','task-permission-confirm',{channel:'dom',scope:'confirmation for selected access mode'},async()=>({value:await dlg.innerText()}));
    const check=dlg.locator('input[type="checkbox"]');
    if(await check.count()!==1)throw Error('Unique risk consent checkbox required');
    await ctx.recorder.action('任务权限风险确认','confirm',{value:args.value,text:read.value},async()=>{
     await check.check();
     await dlg.getByRole('button',{name:`启用${args.value}`,exact:true}).click();
     await dlg.waitFor({state:'hidden'});
    });
   }
   await c.page.waitForFunction(({trigger,value})=>document.querySelector(trigger)?.innerText.trim()===value,{trigger,value:args.value});
  });
  const after=await ctx.recorder.read('任务权限修改后','task-permission',{channel:'dom',scope:'当前任务'},async()=>({value:(await button.innerText()).trim(),raw:{aria:await button.getAttribute('aria-label'),session:await c.page.locator('[data-conversation-session]').getAttribute('data-conversation-session')}}));
  return {action_refs:[act.event_id],observations:{before,after}};
 }finally{await c.close();}
}
