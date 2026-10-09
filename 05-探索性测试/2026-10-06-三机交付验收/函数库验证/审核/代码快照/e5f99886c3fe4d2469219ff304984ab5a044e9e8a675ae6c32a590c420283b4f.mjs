import { connect } from '../../automation/session.mjs';
import { SEL } from '../../automation/conversation.mjs';
export async function readComposer(ctx){const c=await connect(ctx);try {
 const read=await ctx.recorder.read('当前编辑区真实状态','composer',{channel:'dom',scope:'当前会话编辑区'},async()=>{
  const el=c.page.locator(SEL.composer).first(),count=await el.count();
  const text=count?await el.innerText():null,visible=count?await el.isVisible():false,editable=count?await el.getAttribute('contenteditable'):null;
  const refs=await el.locator('[data-ref],[class*="chip"]').allInnerTexts();
  const model=c.page.locator(SEL.model).first(),project=c.page.locator(SEL.project).first();
  return {value:{visible,editable,text,refs,model:await model.getAttribute('aria-label'),project:await project.innerText()},raw:{count}};
 });return {observations:{read}};
}finally{await c.close();}}
export async function clearDraft(ctx){const c=await connect(ctx);try{const event=await ctx.recorder.action('清空当前草稿','fill','',async()=>{await c.page.locator(SEL.composer).first().fill('');});return {action_refs:[event.event_id],...(await readComposer({...ctx,connection:c}))};}finally{await c.close();}}
export async function readDialogs(ctx){const c=await connect(ctx);try{const read=await ctx.recorder.read('各表面可见弹窗','dialogs',{channel:'dom',scope:'主界面及全部iframe'},async()=>{
 const dialogs=[];for(const f of c.page.frames()){const texts=await f.locator('[role="dialog"]:visible,[data-shortcut-modal]:visible').allInnerTexts();dialogs.push(...texts.map(text=>({frame:f.url(),text})));}return {value:dialogs,raw:{count:dialogs.length}};
 });return {observations:{read}};}finally{await c.close();}}
export async function closeDialogs(ctx){const c=await connect(ctx);try{const action=await ctx.recorder.action('关闭页面内弹窗','Escape',null,async()=>{for(let i=0;i<5;i++){const r=await readDialogs({...ctx,connection:c});if(!r.observations.read.value.length)return;await c.page.keyboard.press('Escape');await c.page.waitForTimeout(300);}const r=await readDialogs({...ctx,connection:c});if(r.observations.read.value.length)throw Error('Dialogs remain after bounded close');});return {action_refs:[action.event_id],...(await readDialogs({...ctx,connection:c}))};}finally{await c.close();}}
