import { connect } from '../../automation/session.mjs';
import { SEL,ensureConversationView } from '../../automation/conversation.mjs';
export async function readConversationAppearance(ctx,args){
 const previous=ctx.expectedSession;ctx.expectedSession=args.sessionId;
 const c=await connect(ctx);try {
  await ensureConversationView(c.page);
  const read=await ctx.recorder.read('指定会话正文与容器颜色','appearance:'+args.sessionId,{channel:'dom',scope:'指定助手正文',locator:SEL.assistantBody},async()=>{
   const exact=new RegExp('^\\s*'+args.replyText.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*$');
   const bodies=c.page.locator(SEL.assistantBody).filter({hasText:exact});
   if(await bodies.count()!==1)throw Error('Expected one reply with the requested unique text');
   const raw=await bodies.evaluate(el=>{const root=el.closest('[class*="root"]')||el.parentElement,a=getComputedStyle(el),b=getComputedStyle(root);return {text:el.innerText,bodyColor:a.color,bodyBg:a.backgroundColor,rootColor:b.color,rootBg:b.backgroundColor};});
   if(raw.text.trim()!==args.replyText)throw Error('Reply identity mismatch');
   return {value:raw,raw:{...raw,sessionId:args.sessionId}};
  });return {observations:{read}};
 }finally{ctx.expectedSession=previous;await c.close();}
}
