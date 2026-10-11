// MIGRATION_HISTORY_ONLY: not a runtime entry point.
if(!process.argv.includes('--rebuild-migration'))throw Error('Historical migration script; do not run against the reviewed library. Use maintenance/verify.mjs.');
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
function change(s,name,body){const a=s.indexOf('export async function '+name+'(');if(a<0)throw Error(name);const b=s.indexOf('\nexport async function ',a+1);return s.slice(0,a)+body+'\n'+s.slice(b<0?s.length:b);}
let s=read('business/skills/manage.mjs');s="import fs from 'node:fs';\n"+s;
s=change(s,'readListIdentity',`export async function readListIdentity(ctx){
 const p=ctx.environment.skills_registry;if(!p)throw Error('environment.skills_registry required');
 const read=await ctx.recorder.read('正式技能内部身份集合',p,{channel:'file',scope:'实际技能注册表'},async()=>{
 const obj=JSON.parse(fs.readFileSync(p,'utf8'));if(!obj.entries)throw Error('Unknown skills registry structure');
 const names=Object.keys(obj.entries).sort();return {value:names,raw:{path:p,count:names.length,names}};
 });return {observations:{read}};
}`);
s=change(s,'readTraceSkillContent',`export async function readTraceSkillContent(ctx,args){
 if(!args.internalName)throw Error('internalName required');const c=await connect(ctx);try{
 const action=await ctx.recorder.action('打开本会话轨迹','click',null,async()=>{await c.page.getByText('轨迹',{exact:true}).first().click();await c.page.waitForTimeout(500);});
 const resource=await ctx.recorder.read('指定技能独立注入内容',args.internalName,{channel:'dom',scope:'当前session轨迹/context'},async()=>{
 const rows=c.page.locator('tr[data-trajectory-row-key]');const matches=[];
 for(const row of await rows.all()){const text=await row.innerText();if(text.includes('<skill_content')&&text.includes('name="'+args.internalName+'"'))matches.push(text);}
 return {value:matches.length?matches.join('\\n'):null,raw:{internalName:args.internalName,matches,session:await c.page.locator('[data-conversation-session]').first().getAttribute('data-conversation-session')}};
 });return {action_refs:[action.event_id],observations:{resource}};
 }finally{await c.close();}
}`);
// Keep uploaded archive and scanned candidate identities distinct.
s=s.replace(/const before = await rec\.read\('技能列表卡片数'[\s\S]*?\n    \}\);/g,"const before=(await readListIdentity(ctx)).observations.read;");
s=s.replace(/const beforeConfirm = await rec\.read\('技能列表卡片片?数'[\s\S]*?\n    \}\);/g,"const beforeConfirm=(await readListIdentity(ctx)).observations.read;");
s=s.replace(/const beforeConfirm = await rec\.read\('技能列表卡片数'[\s\S]*?\n    \}\);/g,"const beforeConfirm=(await readListIdentity(ctx)).observations.read;");
s=s.replace("const value = /\\.zip/i.test(t) && /个文件/.test(t);","const objects=await frame.locator(SKILL_SEL.dialog+' [data-skill-name]').evaluateAll(els=>els.map(e=>e.getAttribute('data-skill-name')));\n      const value=objects.length>0;");
s=s.replace("return { value, raw: { text: t }, derivation: '弹窗含 ZIP 与文件计数' };","return { value, raw: { text:t, scannedInternalNames:objects, uploadSelected:/\\.zip/i.test(t) }, derivation:'explicit scanned candidate identities, not archive filename' };");
// Tree state reads must stay on the same detail view.
s=s.replace("const { frame } = conn;\n    const rec = ctx.recorder;\n    const read = await rec.read('目录树节点可见状态'","const { frame,page } = conn;\n    await ensureDetail(frame,page,displayName);\n    const rec = ctx.recorder;\n    const read = await rec.read('目录树节点可见状态'");
s=s.replace("const el = frame.locator(TREE).getByText(label, { exact: true }).first();","await frame.locator(TREE).waitFor({state:'visible'});\n      const el = frame.locator(TREE).getByText(label, { exact: true }).first();");
write('business/skills/manage.mjs',s);
s=read('business/experts/manage.mjs');s=change(s,'readTraceExpertContent',`export async function readTraceExpertContent(ctx,args){
 const needle=args.internalName||args.contains;if(!needle)throw Error('internalName or contains required');const c=await connect(ctx);try{
 const action=await ctx.recorder.action('打开专家调用轨迹','click',null,async()=>{await c.page.getByText('轨迹',{exact:true}).first().click();await c.page.waitForTimeout(500);});
 const resource=await ctx.recorder.read('专家独立加载/工具读取记录',needle,{channel:'dom',scope:'当前session轨迹/context或工具read'},async()=>{
 const rows=c.page.locator('tr[data-trajectory-row-key]');const matches=[];
 for(const row of await rows.all()){const text=await row.innerText();if(text.includes(needle)&&(text.includes('<skill_content')||(/read/.test(text)&&text.includes('<content>'))))matches.push(text);}
 return {value:matches.length?matches.join('\\n'):null,raw:{needle,matches}};
 });return {action_refs:[action.event_id],observations:{resource}};
 }finally{await c.close();}
}`);write('business/experts/manage.mjs',s);
console.log('Corrected registry identity, trace source and tree view continuity');
