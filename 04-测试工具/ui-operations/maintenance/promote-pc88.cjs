// MIGRATION_HISTORY_ONLY: not a runtime entry point.
if(!process.argv.includes('--rebuild-migration'))throw Error('Historical migration script; do not run against the reviewed library. Use maintenance/verify.mjs.');
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const source=path.join(root,'sources/PC-88/code/automation'),dest=path.join(root,'automation/pc88');fs.mkdirSync(dest,{recursive:true});
for(const file of ['session.mjs','conversation.mjs','skills.mjs']){
 let s=fs.readFileSync(path.join(source,file),'utf8');
 if(file==='session.mjs'){
  s=s.slice(s.indexOf('export const skillsFrame'));
  s=s.replace("if (await btn.count()) { await btn.click(); await page.waitForTimeout(600); }","if (await btn.count() && page.frames().some(f=>f.url().includes(name==='技能'?'supcon-skills':'supcon-agents'))) { await btn.click(); await page.waitForTimeout(600); }");
 }
 s=s.replaceAll('.catch(() => {})','');
 if(file==='skills.mjs'){
  s=s.replace("const sw = sf.locator('.card-main [role=switch]').first();","if(await sf.locator('.card-main').count()!==1)throw Error('Search must resolve one skill card');\n  const sw = sf.locator('.card-main [role=switch]').first();");
  s=s.replace("const nameMatch = body.match(/\\r?\\nname:\\s*([^\\r\\n]+)/);","const preview=sf.locator('[class*=\"dir-preview\"]').first();await preview.waitFor({state:'visible'});\n  const content=await preview.innerText();\n  const nameMatch = content.match(/(?:^|\\r?\\n)name:\\s*([^\\r\\n]+)/);");
  s=s.replace("nameMatch[1].trim()","nameMatch[1].trim().replace(/^['\"]|['\"]$/g,'')");
 }
 if(file==='conversation.mjs'){
  s="import { SEL, runningIndicatorCount } from '../conversation.mjs';\n"+s;
  s=s.replaceAll("page.getByRole('textbox').first()","page.locator(SEL.composer).first()");
  s=s.replace("const scopes = [...document.querySelectorAll('[class*=composer i],[class*=Composer]')];","const scope=document.querySelector('div[contenteditable=\"true\"][aria-label*=\"/ 调用指令\"]');if(!scope)throw Error('Composer not found');");
  s=s.replace("[...document.querySelectorAll('[class*=chip i],[data-ref],[aria-label*=\"移除\"]')]","[...scope.querySelectorAll('[class*=chip i],[data-ref],[aria-label*=\"移除\"]')]");
  const a=s.indexOf('export async function waitForIdle'),b=s.indexOf('export async function readAssistantMessages',a);
  s=s.slice(0,a)+`export async function waitForIdle(page, timeoutMs=95000){
 const start=Date.now();while(Date.now()-start<timeoutMs){
  const n=await runningIndicatorCount(page);const stop=await page.getByRole('button',{name:/停止/}).count();
  const replies=await page.locator(SEL.assistantBody).allInnerTexts();
  if(n===0&&stop===0&&replies.some(t=>t.trim()))return {idle:true,replies};
  await page.waitForTimeout(500);
 }return {idle:false,timed_out:true};
}
`+s.slice(b);
  const a2=s.indexOf('export async function readAssistantMessages');s=s.slice(0,a2)+`export async function readAssistantMessages(page){return page.locator(SEL.assistantBody).allInnerTexts();}
export async function isCompleted(page){const running=await runningIndicatorCount(page);const replies=await readAssistantMessages(page);return {running,replies,completed:running===0&&replies.some(t=>t.trim())};}
`;
 }
 fs.writeFileSync(path.join(dest,file),s);
}
const definitions=[];
const bind={
 session:{skillsFrame:[],expertsFrame:[],closeDialogs:['tries'],ensureMoreMenu:[],goHome:[],openSkills:[],openExperts:[],closeSidebarPanels:[]},
 conversation:{readComposerState:[],selectProject:['name'],setReasoning:['level'],typeDraft:['text'],send:[],waitForIdle:['timeoutMs'],readAssistantMessages:[],isCompleted:[]},
 skills:{skillsFrame:[],ensureMenu:[],openSkills:[],closeSkills:[],importSkill:['filePath'],search:['term'],listCards:[],readSwitch:['term'],setSwitch:['term','on'],openAndReadDetail:['term']}
};
let code=`import {connect} from '../../automation/session.mjs';\nimport * as navigation from '../../automation/pc88/session.mjs';\nimport * as conversation from '../../automation/pc88/conversation.mjs';\nimport * as skills from '../../automation/pc88/skills.mjs';\n`;
for(const [module,methods] of Object.entries(bind))for(const [name,params] of Object.entries(methods)){
 const category=module==='session'?'navigation':module,exportName=category+'_'+name,isFrame=name.endsWith('Frame')||name==='openSkills'||name==='openExperts';
 const prefix=module==='skills'&&['importSkill','search','readSwitch','setSwitch','openAndReadDetail'].includes(name)?'c.page, await navigation.openSkills(c.page), ':module==='skills'&&name==='listCards'?'await navigation.openSkills(c.page), ':'c.page, ';
 const args=prefix+params.map(p=>'args.'+p).join(', ');
 code+=`export async function ${exportName}(ctx,args={}){const c=await connect(ctx);try{const read=await ctx.recorder.read('PC88 ${category}.${name}','${category}.${name}',{channel:'dom',scope:'${category}'},async()=>{const result=await ${category}.${name}(${args.replace(/, $/,'')});return {value:${isFrame?"result?{url:result.url()}:null":"result??null"},raw:{parameters:args}};});return {observations:{read}};}finally{await c.close();}}\n`;
 definitions.push({name:'smoke.'+category+'.'+name,file:'business/smoke/compat.mjs',export:exportName,description:'PC-88 '+category+'.'+name+'（共用接入与记录）',feature_path:['冒烟',category,name],parameters:{type:'object',properties:Object.fromEntries(params.map(p=>[p,{type:p==='on'?'boolean':p==='tries'||p==='timeoutMs'?'number':'string'}])),required:params.filter(p=>!['tries','timeoutMs'].includes(p)),additionalProperties:false}});
}
fs.mkdirSync(path.join(root,'business/smoke'),{recursive:true});fs.writeFileSync(path.join(root,'business/smoke/compat.mjs'),code);fs.writeFileSync(path.join(root,'maintenance/pc88-functions.json'),JSON.stringify(definitions,null,2));console.log(definitions.length+' PC88 functions promoted');
