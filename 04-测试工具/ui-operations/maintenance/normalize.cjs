// MIGRATION_HISTORY_ONLY: not a runtime entry point.
if(!process.argv.includes('--rebuild-migration'))throw Error('Historical migration script; do not run against the reviewed library. Use maintenance/verify.mjs.');
// One-time normalization of imported implementations. Original bytes remain in sources/.
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),write=(p,s)=>fs.writeFileSync(path.join(root,p),s,'utf8');
function replaceFunction(s,name,body){const re=new RegExp('export async function '+name+'\\('),m=re.exec(s);if(!m)throw Error('Missing '+name);const start=m.index;const next=s.indexOf('\nexport async function ',start+1);const end=next<0?s.length:next;return s.slice(0,start)+body+'\n'+s.slice(end);}
for(const p of ['automation/skills.mjs','automation/experts.mjs']){
 let s=read(p),which=p.includes('skills')?'SKILL':'EXPERT';
 s=s.replace('ctx) {','ctx, { preserveView = false } = {}) {');
 s=s.replaceAll('if (await frame.locator(\'[class*="dir-preview"]\').count())','if (!preserveView && await frame.locator(\'[class*="dir-preview"]\').count())');
 s=s.replace('if ((await frame.locator(\'div[class*="_card_"]\').count())','if (!preserveView && (await frame.locator(\'div[class*="_card_"]\').count())');
 s=s.replace(/return frame\.locator\([^\n]+hasText: title[^\n]+;/,`if(!title)throw Error('displayName required');\n  const pattern=new RegExp('^'+title.replace(/[.*+?^\u0024{}()|[\\]\\\\]/g,'\\\\\u0024&')+'\u0024');\n  return frame.locator(${which}_SEL.card).filter({has:frame.locator(${which}_SEL.cardTitle).filter({hasText:pattern})});`);
 s=s.replaceAll('.catch(() => {})','');write(p,s);
}
for(const p of ['business/skills/manage.mjs','business/experts/manage.mjs','business/settings/general.mjs']){
 let s=read(p);s=`import { parseBoolean, readComposerRequest } from '../../automation/identity.mjs';\n`+s;
 s=s.replaceAll("aria === 'true'",'parseBoolean(aria)').replaceAll("aria !== 'true'",'!parseBoolean(aria)').replaceAll("(await ctl.getAttribute('aria-checked')) === 'true'","parseBoolean(await ctl.getAttribute('aria-checked'))").replaceAll("(a) => a === 'true'","(a) => parseBoolean(a)");
 s=s.replaceAll("args.base || 'C:/Users/yuzechao/.tpt-work/agents'","args.base || ctx.environment.agents_root");
 s=s.replaceAll("path.resolve(process.cwd(), '运行日志/business.jsonl')","path.resolve(ctx.taskRoot, '运行日志/business.jsonl')");
 s=s.replaceAll("{ hasText: 'Arthur' }","{ hasText: ctx.environment.account_name }");
 s=s.replaceAll('.catch(() => {})','');
 if(p.includes('settings')){s=s.replace('async function openShortcutEditor(page)', 'async function openShortcutEditor(page, ctx)').replaceAll('await openShortcutEditor(page);','await openShortcutEditor(page, ctx);');s=s.replace("const delta = args.delta || 1;","const delta = args.delta ?? 1;");s=s.replace(/fields\['主题'\] =[^\n]+;/,"fields['主题'] = (await readPressedText(page, ['浅色','深色','跟随系统'])).value;");}
 if(p.includes('experts')){
  s=s.replace('const info = await page.evaluate(() => [...document.querySelectorAll(\'input[webkitdirectory],input[type="file"]\')]','const info = await conn.frame.evaluate(() => [...document.querySelectorAll(\'input[webkitdirectory],input[type="file"]\')]');
  s=s.replace('const hasEnd = /FAST_PROMPT_END/.test(text);','const hasEnd = args.endMarker ? text.includes(args.endMarker) : null;');
  s=s.replace("answer = 'FAST_EXPERT_EXEC_OK'","answer").replace("const needle = args.contains || 'FAST_EXPERT_EXEC_OK';","const needle = args.contains || args.internalName;\n  if(!needle)throw Error('contains or internalName required');");
 }
 if(p.includes('skills')){
  s=s.replace("answer = 'FAST_SKILL_EXEC_OK'","answer");
  for(const name of ['readDetailTree','clickTreeNode','toggleTreeFolder','readTreeNodeVisible']){
   const start=s.indexOf('export async function '+name+'('),end=s.indexOf('\nexport async function ',start+1);const piece=s.slice(start,end<0?s.length:end).replace('connectSkills(ctx)','connectSkills(ctx, { preserveView: true })');s=s.slice(0,start)+piece+s.slice(end<0?s.length:end);
  }
  s=s.replace("const value = info.selected || (info.names || []).find((n) => /\\.md$/i.test(n)) || null;","const value = info.selected || null;");
 }
 // Bind full input to the current submission, not an old enclosing user container.
 for(const name of ['useSkillRequest','useExpertRequest'])if(s.includes('export async function '+name+'(')){
  const start=s.indexOf('export async function '+name+'('),end=s.indexOf('\nexport async function ',start+1);let piece=s.slice(start,end<0?s.length:end);
  piece=piece.replace('let preCount = 0;','let preCount = 0, submittedRequest;');
  piece=piece.replace('await page.locator(SEL.send).first().click();','submittedRequest = await readComposerRequest(page, SEL.composer);\n      await page.locator(SEL.send).first().click();');
  const a=piece.indexOf("      const els = page.locator('[class*=\"wSkVaW_body\"]');"),b=piece.indexOf('\n    });',a);
  if(a<0||b<0)throw Error('Request reader not found');
  piece=piece.slice(0,a)+"      if(typeof answer!=='string'||!submittedRequest)throw Error('answer and submitted composer observation required');\n      const requestText=submittedRequest.text;\n      return { value: requestText.includes(answer), raw: { requestText, session:submittedRequest.session, answer, capturedBeforeSend:true }, derivation:'complete submitted composer text.includes(answer)' };"+piece.slice(b);
  s=s.slice(0,start)+piece+s.slice(end<0?s.length:end);
 }
 write(p,s);
}
let s=read('automation/settings.mjs').replaceAll("{ hasText: 'Arthur' }","{ hasText: ctx.environment.account_name }").replaceAll('.catch(() => {})','');
s=s.replace('if (await cell.count()) { await cell.first().click(); await page.waitForTimeout(1000); }',"if (!(await cell.count()))throw Error('Settings category not found: '+name);\n  await cell.first().click(); await page.waitForTimeout(1000);");write('automation/settings.mjs',s);
s=read('business/conversation/tasks.mjs').replaceAll('.catch(() => {})','');s=s.replace("await box.fill(q => q, { force: true });",'').replace("const box = page.locator('input[type=\"search\"],input[placeholder*=\"搜索\"],input').first();","const box = page.locator('input[type=\"search\"]:visible,input[placeholder*=\"搜索\"]:visible').first();");write('business/conversation/tasks.mjs',s);
console.log('Normalized portability, exact card matching, boolean reads, frame and request identity');
