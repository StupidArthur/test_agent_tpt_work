// MIGRATION_HISTORY_ONLY: not a runtime entry point.
if(!process.argv.includes('--rebuild-migration'))throw Error('Historical migration script; do not run against the reviewed library. Use maintenance/verify.mjs.');
const fs=require('fs'),path=require('path');const p=path.join(__dirname,'../business/skills/manage.mjs');let s=fs.readFileSync(p,'utf8');
function change(name,body){const a=s.indexOf('export async function '+name+'('),b=s.indexOf('\nexport async function ',a+1);if(a<0)throw Error(name);s=s.slice(0,a)+body+'\n'+s.slice(b<0?s.length:b);}
change('readFirstCardIdentity',`export async function readFirstCardIdentity(ctx,args){
 if(!args.internalName)throw Error('internalName required');const c=await connectSkills(ctx,{preserveView:true});try{
 const read=await ctx.recorder.read('当前技能详情实际内部名称',args.internalName,{channel:'dom',scope:'技能详情/SKILL.md预览'},async()=>{
 const preview=c.frame.locator('[class*="dir-preview"]').first();await preview.waitFor({state:'visible'});const text=await preview.innerText(),actualName=frontmatterName(text);return {value:actualName===null?null:actualName===args.internalName,raw:{actualName,expectedIdentity:args.internalName,text}};
 });return {observations:{read}};
 }finally{await c.close();}
}`);
// Compare parsed technical name; a coincident display title is not an identity proof.
s=s.replace("const hasInternal = internalName ? text.includes(internalName) : false;", "const full=await frame.locator('[class*=\"dir-preview\"]').first().innerText();\n      const actualName=frontmatterName(full);\n      const hasInternal = internalName ? actualName===internalName : null;");
s=s.replace('return { value: hasInternal || hasDisplay, raw: { detailText: text, hasInternal, hasDisplay, internalName, matchText }', 'return { value: hasInternal, raw: { detailText: full, actualName, hasInternal, hasDisplay, internalName, matchText }');
change('readSkillNames',`export async function readSkillNames(ctx,args={}){
 const result=await readListIdentity(ctx),names=result.observations.read.value;
 const read=await ctx.recorder.read('正式技能实际内部名称',args.query||'all',{channel:'derived',scope:'实际技能注册表内部身份',event_refs:[result.observations.read.event_id]},async()=>({value:names.filter(n=>!args.query||n.includes(args.query)).sort(),raw:{allNames:names,query:args.query||null,deprecatedExactTitle:args.exactTitle||null},derivation:'filter registered internal names by requested search prefix, never filter by expected display title'}));return {observations:{read}};
}`);
fs.writeFileSync(p,s);
