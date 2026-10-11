// MIGRATION_HISTORY_ONLY: not a runtime entry point.
if(!process.argv.includes('--rebuild-migration'))throw Error('Historical migration script; do not run against the reviewed library. Use maintenance/verify.mjs.');
const fs=require('fs'),path=require('path'),p=path.join(__dirname,'../coverage/cases.json');const out=JSON.parse(fs.readFileSync(p,'utf8'));
const getArgs=(name,id)=>{
 const internalName=id==='SM-08'||id==='SM-09'?'${smoke.expertName}':'${smoke.skillName}';
 const displayName=id==='SM-08'||id==='SM-09'?'本轮快速回归专家':'本轮快速回归技能';
 switch(name){
 case 'application.inspectConnection':return {asarPath:'${asar_path}'};
 case 'conversation.newTask':return {projectPath:'${project_path}',model:'标准',reasoning:'low'};
 case 'conversation.sendMessage':return {text:'只回复：SMOKE_CHAT_${run}_OK',timeoutMs:90000};
 case 'attachments.addLocalFiles':return {paths:['${smoke.base}/attachments/attachment-a.txt']};
 case 'attachments.removeAttachment':return {name:'attachment-a.txt'};
 case 'skills.importSingleFile':return {filePath:'${smoke.base}/skill-src/SKILL.md',displayName,internalName};
 case 'skills.searchSkills':return {term:internalName};
 case 'skills.readSkillDetail':case 'skills.readSkillCard':case 'skills.quickUse':return {displayName,internalName};
 case 'skills.setSkillEnabled':return {displayName,internalName,value:id==='SM-12'?false:true};
 case 'skills.useSkillRequest':return {text:'请执行当前技能的固定回复规则。',answer:'${smoke.skillReply}',timeoutMs:90000};
 case 'experts.importDirectory':return {dirPath:'${smoke.base}/expert-src',displayName,internalName};
 case 'experts.readDetail':case 'experts.useExpert':return {displayName,internalName};
 case 'experts.useExpertRequest':return {text:'请执行你的固定回复规则。',answer:'${smoke.expertReply}',timeoutMs:90000};
 case 'settings.readShortcut':return {label:'${shortcut_label}'};
 case 'conversation.openSession':return {sessionId:'${sessions.chat}',title:'只回复：SMOKE_CHAT_${run}_OK'};
 case 'settings.readConversationAppearance':return {sessionId:'${sessions.chat}',replyText:'SMOKE_CHAT_${run}_OK'};
 case 'settings.setTheme':return {value:'${theme_target}'};
 default:return {};
 }
};
for(const c of out.cases){
 c.operation_steps=c.steps.map((description,step)=>({step:step+1,description,functions:[...new Set([...c.calls,...c.corrections].map(x=>x.name))],instruction:'按步骤语义选择对应函数；读取函数不替代动作。需要动态初值/返回值时先读取，后续调用重新绑定参数。'}));
 c.restore_rules='仅恢复本case实际改动项；未调用备份不调用restoreFile。先读原值，保存恢复凭据，按原值调用set函数，最后独立回读。';
 if(c.case_id.startsWith('SM-')){for(const call of c.calls)call.args=getArgs(call.name,c.case_id);c.parameter_rules='${...}由本轮环境/prepareSmokeFixtures返回值/真实初值/会话ID替换；布尔占位不能以字符串传入。';}
}
fs.writeFileSync(p,JSON.stringify(out,null,2));
