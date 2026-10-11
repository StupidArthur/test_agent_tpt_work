import {connect} from '../../automation/session.mjs';import {connectSkills} from '../../automation/skills.mjs';import {connectExperts} from '../../automation/experts.mjs';import {SEL,ensureConversationView,runningIndicatorCount} from '../../automation/conversation.mjs';
export async function readDetailIdentity(ctx,args){
 const c=await (args.kind==='skill'?connectSkills:connectExperts)(ctx,{preserveView:true});try{
 const read=await ctx.recorder.read('当前详情实际身份、版本和来源',args.kind,{channel:'dom',scope:args.kind+'/详情'},async()=>{
 const body=await c.frame.locator('body').innerText(),preview=c.frame.locator(args.kind==='skill'?'[class*="dir-preview"]':'[data-slot="markdown"]').first();await preview.waitFor({state:'visible'});const text=await preview.innerText();const name=/\bname:\s*["']?([A-Za-z0-9_.-]+)(?:["']?)(?=\s|$)/.exec(text)?.[1]??null;
 const version=/(?:版本\s*\n?\s*v?|\nv)(\d+\.\d+\.\d+)/.exec(body)?.[1]??null;const source=/来源\s*\n?\s*([^\n]+)/.exec(body)?.[1]?.trim()??null;
 return {value:{name,version,source,sourceCategory:source&&/用户|我创建|本地导入/.test(source)?'用户':source},raw:{body,preview:text}};
 });return {observations:{read}};
 }finally{await c.close();}
}
export async function readCompletion(ctx,args){const old=ctx.expectedSession;ctx.expectedSession=args.sessionId;const c=await connect(ctx);try{await ensureConversationView(c.page);const read=await ctx.recorder.read('指定会话本轮回复和完成状态',args.sessionId,{channel:'dom',scope:'当前session对话面板'},async()=>{
 const root=c.page.locator('[data-conversation-session]');const actual=await root.getAttribute('data-conversation-session');if(actual!==args.sessionId)throw Error('Session identity mismatch');const body=await root.innerText(),replies=await root.locator(SEL.assistantBody).allInnerTexts(),matching=replies.map(t=>t.trim()).filter(t=>t===args.replyText),running=await runningIndicatorCount(c.page);return {value:{sessionId:actual,replyMatches:matching.length,completed:matching.length===1&&/已完成工作/.test(body)&&running===0},raw:{body,replies,running,completionLabel:'已完成工作'}};
 });return {observations:{read}};}finally{ctx.expectedSession=old;await c.close();}}
