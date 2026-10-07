// MIGRATION_HISTORY_ONLY: not a runtime entry point.
if(!process.argv.includes('--rebuild-migration'))throw Error('Historical migration script; do not run against the reviewed library. Use maintenance/verify.mjs.');
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const original=JSON.parse(fs.readFileSync(path.join(root,'sources/PC-G/code/business/catalog.json'),'utf8'));
const functions=original.functions.map(f=>({...f,file:f.file.replace(/^code\//,''),modules:(f.modules||[]).map(x=>x.replace(/^code\//,'')),version:'portable-1.0',status:'已迁移-验证状态见verification.json',origin:{machine:'PC-G',commit:'7aff430',export:f.export},preconditions:['当前实例CDP及环境身份已核验','对象名称/路径来自本轮夹具，不能沿用历史对象','模型依赖函数允许业务失败/超时，返回观察不判case通过'],returns:'真实observations与事件引用；读取失败抛错并登记null+error',cleanup:'调用者按case恢复；文件写入前调用fixtures.backupFile，最后restoreFile并回读'}));
function param(name,key,type,required=false){const f=functions.find(x=>x.name===name);if(!f)throw Error(name);f.parameters.properties[key]={type};if(required&&!f.parameters.required.includes(key))f.parameters.required.push(key);}
for(const f of ['skills.useSkillRequest','experts.useExpertRequest']){param(f,'text','string',true);param(f,'answer','string',true);}
param('skills.readTraceSkillContent','internalName','string',true);param('experts.readTraceExpertContent','internalName','string');param('experts.readDetail','endMarker','string');
for(const f of ['experts.listAgentDirs','experts.readInstallPaths','experts.readAgentDirFiles'])param(f,'base','string');
for(const f of JSON.parse(fs.readFileSync(path.join(root,'maintenance/pc88-functions.json'),'utf8')))functions.push({...f,version:'portable-1.0',status:'已迁移-验证状态见verification.json',origin:{machine:'PC-88',commit:'490e6ee'},preconditions:['使用本轮实例、对象、请求','作用在当前表面，必要时传--session-id进行绑定'],returns:'真实observations；错误登记并抛出',cleanup:'设置及样本状态按case独立恢复'});
function add(name,file,description,properties={},required=[],channel='ui'){
 functions.push({name,file,export:name.split('.').at(-1),feature_path:[name.split('.')[0],name.split('.').at(-1)],description,version:'portable-1.0',status:'已实现-验证状态见verification.json',origin:{machine:'管理者整理'},parameters:{type:'object',additionalProperties:false,properties:Object.fromEntries(Object.entries(properties).map(([k,v])=>[k,typeof v==='string'?{type:v}:v])),required},channel,preconditions:['使用本轮环境及对象身份'],returns:'真实observations与动作/读取引用；不判case',cleanup:'根据函数副作用及本轮恢复记录收尾'});
}
add('application.inspectConnection','business/application/inspect.mjs','核对CDP目标、主页面及安装包哈希',{asarPath:'string'});
for(const [name,desc]of Object.entries({readComposer:'读取编辑器、草稿、引用、模型与项目',clearDraft:'清空当前草稿并回读',readDialogs:'读取主页面及iframe中的弹窗',closeDialogs:'有限关闭页面内弹窗并确认'}))add('conversation.'+name,'business/conversation/surfaces.mjs',desc);
add('settings.readConversationAppearance','business/settings/appearance.mjs','固定session及唯一回复正文，读取同一正文和容器计算颜色',{sessionId:'string',replyText:'string'},['sessionId','replyText']);
const files={prepareFixtures:[{run:'string'},['run']],backupFile:[{path:'string'},['path']],readFile:[{path:'string'},['path']],writeFile:[{path:'string',content:'string',expectedHash:'string'},['path','content']],restoreFile:[{path:'string',backup:'string',sha256:'string'},['path','backup','sha256']],prepareProjectFiles:[{projectRoot:'string',run:'string'},['projectRoot','run']],identityDelta:[{before:{type:'array',items:{type:'string'}},after:{type:'array',items:{type:'string'}},readRefs:{type:'array',items:{type:'string'}}},['before','after']]};
for(const [name,[properties,required]]of Object.entries(files))add('fixtures.'+name,'business/fixtures/files.mjs',name+'（本轮样本/文件准备与恢复）',properties,required,'file');
add('fixtures.startLinkServer','business/fixtures/links.mjs','启动本轮loopback链接夹具',{run:'string'},['run'],'process');add('fixtures.stopLinkServer','business/fixtures/links.mjs','核对并停止本轮链接夹具',{state:'string'},['state'],'process');
add('fixtures.prepareSmokeFixtures','business/fixtures/files.mjs','生成冒烟专用唯一身份及答复标记',{run:'string'},['run'],'file');
add('experts.scrollPromptToEnd','business/experts/scroll.mjs','滚动指定专家提示词并验证末尾标记处于可视裁剪区',{displayName:'string',endMarker:'string'},['displayName','endMarker']);
add('settings.listPluginCards','business/settings/plugins.mjs','读取内置插件卡片及初始折叠状态');
add('settings.setPluginExpanded','business/settings/plugins.mjs','指定插件展开/收起并回读详情',{label:'string',expanded:'boolean'},['label','expanded']);
for(const f of functions){f.parameters.required??=[];f.parameters.properties??={};f.modules??=[];}
for(const f of functions.filter(f=>/^(skills|experts)\./.test(f.name)))f.parameters.properties.internalName??={type:'string'};
fs.writeFileSync(path.join(root,'business/catalog.json'),JSON.stringify({schema_version:'1.0',version:'portable-1.0',functions},null,2)+'\n');console.log(functions.length+' functions registered');
