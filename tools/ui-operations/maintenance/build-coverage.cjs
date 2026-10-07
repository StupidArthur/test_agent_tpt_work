// MIGRATION_HISTORY_ONLY: not a runtime entry point.
if(!process.argv.includes('--rebuild-migration'))throw Error('Historical migration script; do not run against the reviewed library. Use maintenance/verify.mjs.');
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..'),repo=path.resolve(root,'../..');
const remote=process.env.TPT_PCG_REVIEW_ROOT||'C:/Users/Administrator/AppData/Local/Temp/tpt-review-pcg-20261006/探索性测试/2026-10-06-业务函数复用回归';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),cases=read(path.join(remote,'用例/cases.json')),catalog=read(path.join(root,'business/catalog.json'));
const jsonl=p=>fs.readFileSync(p,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const calls=new Map(jsonl(path.join(remote,'运行日志/业务调用.jsonl')).map(c=>[c.call_id,c]));
const events=new Map(jsonl(path.join(remote,'运行日志/business.jsonl')).filter(e=>e.event_id).map(e=>[e.event_id,e]));
function template(x){if(Array.isArray(x))return x.map(template);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,template(v)]));if(typeof x!=='string')return x;return x.replaceAll('fn-20261006-agent2','${run}').replaceAll('C:/Users/yuzechao/.tpt-work/agents','${agents_root}').replaceAll('C:\\Users\\yuzechao\\.tpt-work\\agents','${agents_root}').replaceAll('C:/Users/yuzechao/.tpt-work/dsh/skills','${skills_root}').replaceAll('C:\\Users\\yuzechao\\.tpt-work\\dsh\\skills','${skills_root}').replaceAll('D:/tpt-workspace/0929/p1','${project_root}').replaceAll('D:\\tpt-workspace\\0929\\p1','${project_root}').replaceAll('F:/code_ai/test_agent_tpt_work/探索性测试/2026-10-06-业务函数复用回归/夹具/本轮/${run}','${fixture_root}').replaceAll('F:\\code_ai\\test_agent_tpt_work\\探索性测试\\2026-10-06-业务函数复用回归\\夹具\\本轮\\${run}','${fixture_root}');}
const rows=[];
for(const c of cases){
 const r=read(path.join(remote,'结果',c.id+'.json'));
 const unique=[...new Set(r.business_call_refs||[])].map(id=>{const call=calls.get(id);if(!call)throw Error('Missing call '+id);const args=template(read(path.join(remote,call.args_path)));if(call.function_name==='skills.readTraceSkillContent')args.internalName=c.id==='G10-07'?'fast-assert-rich-${run}':'fast-assert-skill-${run}';if(call.function_name==='experts.readDetail')args.endMarker='FAST_PROMPT_END';if(['skills.useSkillRequest','experts.useExpertRequest'].includes(call.function_name)){args.text??=call.function_name.startsWith('skills')?'请执行本轮回归技能的固定回复规则':'请执行你的本轮回归固定回复规则';args.answer??=call.function_name.startsWith('skills')?'FAST_SKILL_EXEC_OK':'FAST_EXPERT_EXEC_OK';}
 const identity=r.object_identity?.internal_name||r.object_identity?.skill||r.object_identity?.expert;
 if(identity&&/^(skills|experts)\./.test(call.function_name))args.internalName=template(identity);
 const entry=catalog.functions.find(f=>f.name===call.function_name);if(!entry)throw Error('Unregistered '+call.function_name);return {name:call.function_name,args,historical_call_id:id,role:'历史动作/读取映射，需根据本轮场景选择有效顺序'};
 });
 const reads=c.assertions.map(a=>{const result=r.assertions.find(x=>x.id===a.id);return {assertion_id:a.id,target:a.target,read:a.read,functions:[...new Set((result?.read_refs||[]).map(id=>events.get(id)?.business_call_id).filter(Boolean).map(id=>calls.get(id)?.function_name).filter(Boolean))]};});
 rows.push({case_id:c.id,title:c.title,feature_path:c.feature_path,source:'PC-G 7aff430',depends_on:c.depends_on||[],steps:c.steps,preparation:['fixtures.prepareFixtures','fixtures.prepareProjectFiles','conversation.newTask'],calls:unique,assertion_reads:reads,restore:['settings.readSnapshot','fixtures.restoreFile','skills.setSkillEnabled','conversation.closeDialogs'],notes:'历史调用不是自动重放脚本；绑定新对象/输入/初值，case失败不改弱判据。'});
}
const smoke=read(path.join(repo,'探索性测试/2026-10-06-冒烟测试/用例/cases.json'));
const mapping={
 'SM-01':['application.inspectConnection'],
 'SM-02':['conversation.newTask','conversation.readComposer'],
 'SM-03':['conversation.sendMessage','conversation.readTaskState'],
 'SM-04':['attachments.addLocalFiles','attachments.readDraftState','attachments.removeAttachment'],
 'SM-05':['skills.importSingleFile','skills.searchSkills','skills.readSkillDetail','skills.readSkillCard'],
 'SM-06':['skills.readSkillCard','skills.setSkillEnabled','smoke.skills.closeSkills','smoke.skills.openSkills'],
 'SM-07':['conversation.newTask','skills.quickUse','conversation.readComposer','skills.useSkillRequest'],
 'SM-08':['experts.importDirectory','experts.readDetail'],
 'SM-09':['conversation.newTask','experts.useExpert','experts.useExpertRequest'],
 'SM-10':['settings.readGeneral','settings.readShortcut'],
 'SM-11':['conversation.openSession','settings.readGeneral','settings.readConversationAppearance','settings.setTheme'],
 'SM-12':['skills.setSkillEnabled','settings.readGeneral','attachments.readDraftState','conversation.clearDraft','conversation.closeDialogs','conversation.readDialogs']};
for(const c of smoke)rows.push({case_id:c.id,title:c.title,feature_path:c.feature_path,source:'PC-88 490e6ee',depends_on:c.depends_on,steps:c.steps,preparation:['fixtures.prepareFixtures'],calls:mapping[c.id].map(name=>({name,args:'按 --describe 的参数契约，使用本轮样本/初值/会话'})),assertion_reads:c.assertions.map(a=>({assertion_id:a.id,target:a.target,read:a.read,functions:mapping[c.id]})),restore:['skills.setSkillEnabled','settings.setTheme','conversation.clearDraft','conversation.closeDialogs'],notes:'主题读值必须sessionId+唯一replyText；样本答复标记需修改到本轮唯一值，不在用户请求中提供答案。'});
const corrections={
 'G3-04':['skills.readTraceSkillContent'], 'G5-02':['experts.readTraceExpertContent'], 'G8-10':['conversation.newTask','conversation.sendMessage','conversation.readWorkSteps'],
 'G9-07':['skills.readListIdentity','fixtures.identityDelta'], 'G9-08':['skills.readListIdentity','fixtures.identityDelta'], 'G9-10':['skills.useSkillRequest'],
 'G10-07':['skills.readTraceSkillContent','fixtures.backupFile','fixtures.restoreFile'], 'G13-04':['experts.readImportDialogFolderInput'],
 'G14-01':['skills.readListIdentity','skills.readImportCandidates'], 'G14-03':['skills.readListIdentity','fixtures.identityDelta'], 'G14-06':['skills.readListIdentity','fixtures.identityDelta','skills.confirmImport'],
 'G11-04':['experts.scrollPromptToEnd'], 'G11-05':['fixtures.backupFile','fixtures.restoreFile'], 'G11-11':['fixtures.backupFile','fixtures.writeFile','fixtures.restoreFile'], 'G11-12':['fixtures.backupFile','fixtures.writeFile','fixtures.restoreFile'],
 'G13-12':['settings.listPluginCards','settings.setPluginExpanded']};
for(const r of rows){r.corrections=(corrections[r.case_id]||[]).map(name=>({name,reason:'审核缺口/未封装步骤修正；优先使用当前函数语义，不沿用历史误读'}));if(r.case_id.startsWith('SM-'))r.preparation=['fixtures.prepareSmokeFixtures'];}
const names=new Set(catalog.functions.map(f=>f.name));const errors=rows.flatMap(r=>[...r.calls,...r.corrections].filter(c=>!names.has(c.name)).map(c=>r.case_id+': '+c.name));
const out={scope:'140必跑回归+12冒烟；不包含旧355需求探索及可选时序/故障注入',total:rows.length,regression:140,smoke:12,unmapped_cases:rows.filter(r=>!r.calls.length).map(r=>r.case_id),unknown_functions:errors,cases:rows};
fs.mkdirSync(path.join(root,'coverage'),{recursive:true});fs.writeFileSync(path.join(root,'coverage/cases.json'),JSON.stringify(out,null,2));
fs.writeFileSync(path.join(root,'coverage/README.md'),'# Case操作映射\n\n范围：两台PC本轮140条必跑回归与12条冒烟。映射不等于重新执行通过。\n\n用 `node tools/tpt-work/call.mjs --plan G3-04` 查看步骤、参数模板、读取、恢复及审核修正。参数模板中的路径/run/session必须重新绑定；历史call_id仅用于追溯。\n\n|case|功能|操作/读取函数|\n|---|---|---|\n'+rows.map(r=>'|'+r.case_id+'|'+r.title+'|'+[...new Set([...r.calls,...r.corrections].map(c=>c.name))].join('、')+'|').join('\n')+'\n');
console.log(JSON.stringify({cases:out.total,unmapped:out.unmapped_cases,unknown:errors}));
