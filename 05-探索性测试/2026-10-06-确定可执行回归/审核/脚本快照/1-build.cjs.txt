const fs=require('fs'),path=require('path'),crypto=require('crypto');const root=path.resolve(__dirname,'..'),prior=path.resolve(root,'../2026-10-05-需求用例全量探索');
const groups=[
['G1','基础对话',[
['新任务入口','DIALOG-001','从新建任务进入，确认编辑器可见','新任务可输入'],
['标准与low','DIALOG-044','观察当前任务模型与推理等级','可使用标准/low，不调用高级模型'],
['已有项目选择','DIALOG-010','从项目选择器选择现有tpt-workspace或当前用户已有项目','显示所选项目，无新增项目'],
['纯文本往返','DIALOG-044','发送FAST_CHAT_OK回显请求，等待终态','助手准确回复标记'],
['完成态','DIALOG-035','读取上一任务完成状态','终态不残留运行中'],
['纯文本无文件','DIALOG-044','检查纯文本任务是否有产物','不生成文件产物'],
['代码块呈现','DIALOG-045','新会话请求代码块A/B两行','代码块可见，内容正确'],
['代码块无产物','DIALOG-045','检查上一任务文件资源','仅代码块，不生成文件']]],
['G2','技能导入与查看',[
['导入弹窗','SKILL-069','点击导入技能，观察页面内弹窗与file input','文件input存在，可直接setInputFiles'],
['单文件导入','SKILL-075','提交本轮有效SKILL.md后点击导入','导入成功，列表出现本轮对象'],
['中文展示名','SKILL-021','定位新卡片','展示name_cn对应本轮中文名称'],
['英文名称搜索','SKILL-004','仅查询FastRegressionSkillUnique','本轮技能命中'],
['描述字段搜索','SKILL-006','清空名称查询，搜索regression-description-unique-token','本轮技能命中且标题不含查询词'],
['版本展示','SKILL-027','读取卡片或详情版本','版本为1.2.3'],
['来源展示','SKILL-075','读取导入卡片来源','显示用户创建'],
['详情正文','SKILL-039','打开本轮技能详情，读取SKILL.md','展示与源文件规则一致']]],
['G3','技能调用与启停',[
['导入默认状态','SKILL-075','不操作开关先记录默认状态','设计期望停用；启用时记录失败，继续后续并按需启用'],
['启用态','SKILL-016','只对本轮技能设启用并回读','开关显示启用'],
['显式使用入口','SKILL-012','详情使用或快捷使用进入新会话','编辑器有本轮技能引用'],
['调用资源装载','SKILL-012','发送固定回复规则请求，读取Trace','含本轮skill内容或工具成功加载记录'],
['调用输出','SKILL-012','核对上一任务终态回复','仅FAST_SKILL_EXEC_OK，不靠用户输入回显'],
['停用回读','SKILL-017','停用本轮样本','开关显示未启用'],
['搜索与停用交集','SKILL-009','保留唯一搜索词，切未启用/已启用','未启用命中本轮样本，已启用不含此样本'],
['筛选恢复','SKILL-009','清空查询切全部，保持本轮技能停用','查询清空、全部列表恢复、本轮对象仍存在']]],
['G4','专家导入与查看',[
['专家导入入口','AGENT-005','点击导入专家观察file/目录input','页面内导入可用'],
['完整目录导入','AGENT-014','提交本轮目录，点击提交','列表出现本轮专家'],
['来源与位置','AGENT-014','读取卡片来源位置','我创建的、本地运行'],
['展示名与版本','AGENT-014','读取本轮卡片','中文名称正确、版本1.2.3'],
['完整提示词','AGENT-021','打开详情读取agent.md','固定回复规则可完整读取'],
['详情只读','AGENT-023','观察提示词面板输入/编辑元素','提示词面板只读'],
['推荐问题','AGENT-009','读取详情推荐问题','与quickPrompts对应'],
['目录入口','AGENT-024','只读观察本地目录按钮，不点击原生目录','存在打开文件夹入口']]],
['G5','专家使用与校验',[
['专家使用选择','EXTRA-006','本轮详情使用进入新会话','选中本轮专家引用'],
['专家资源注入','EXTRA-006','请求固定回复规则并读取Trace','本轮专家正文被注入'],
['专家输出','EXTRA-006','核对上一终态回复','精确FAST_EXPERT_EXEC_OK'],
['同名冲突入口','AGENT-017','再次提交同一个本轮目录','出现覆盖/副本选择，不覆盖'],
['副本导入','AGENT-018','明确选择作为副本','新增独立对象/目录'],
['原对象不变','AGENT-018','回读原文件与导入前哈希','原agent.md及metadata内容不被覆盖'],
['缺必填文件拒绝','AGENT-015','导入expert-missing-agent目录','被拒绝，不产生对象'],
['坏JSON拒绝','AGENT-030','导入expert-bad-json目录','被拒绝，源文件不变，列表无半成品']]],
['G6','设置真实效果',[
['主题效果','OTHER-019','记录初值，切不同主题观察颜色，重开回读后恢复','页面颜色改变，保存可回读，恢复初值'],
['语言效果','OTHER-019','记录初值，中文与English切换后恢复','设置导航语言改变并恢复'],
['字号保存','OTHER-019','记录字号，增1px关闭重开设置','增量保存可回读'],
['字号行为与恢复','OTHER-019','用本轮新会话短回答测computed font-size，恢复初值再读','回答字号随配置变化并恢复'],
['默认权限保存','OTHER-019','记录初值，切仅可查看，重开回读','默认值保存成功'],
['默认权限新任务','OTHER-019','新建本轮空白任务读权限标签，再恢复原默认','新任务显示仅可查看，设置恢复初值'],
['场景默认行为','OTHER-019','记录初值切PTC，新建空白任务','新任务显示PTC，不发送现场请求'],
['场景恢复','OTHER-019','恢复原场景，再新建空白任务核对','新任务显示原场景']]]];
const cases=[],sources=[];for(const [group,label,rows] of groups){rows.forEach(([title,id,action,expected],i)=>{const record=JSON.parse(fs.readFileSync(path.join(prior,'执行记录',id+'.json'),'utf8'));const latest=record.attempts.find(a=>a.attempt_id===record.latest_attempt_id)||record.attempts.at(-1);if(!latest)throw Error('No actual attempt '+id);const case_id=group+'-'+String(i+1).padStart(2,'0');cases.push({id:case_id,group,group_title:label,title,steps:[action],expected:[expected],fixture:group==='G2'||group==='G3'?'本轮skill-template':group==='G4'||group==='G5'?'本轮expert-template及坏包':'本轮会话/初始设置',evidence_required:['限定被测表面的DOM或Trace；关键变化截图','本轮标记/对象归属；变化须恢复核验'],prior_case:id,prior_attempt:latest.attempt_id});sources.push({case_id,prior_case:id,record_path:path.relative(root,path.join(prior,'执行记录',id+'.json')).replace(/\\/g,'/'),prior_attempt:latest.attempt_id,prior_status:record.status,evidence:latest.evidence||[],note:'仅证明此路径曾有真实尝试，不预填本轮业务结论'});});}
if(cases.length!==48)throw Error('Expected 48');fs.mkdirSync(path.join(root,'用例'),{recursive:true});fs.mkdirSync(path.join(root,'结果'),{recursive:true});fs.mkdirSync(path.join(root,'证据'),{recursive:true});fs.writeFileSync(path.join(root,'用例/cases.json'),JSON.stringify(cases,null,2)+'\n');fs.writeFileSync(path.join(root,'用例/历史可执行依据.json'),JSON.stringify(sources,null,2)+'\n');console.log('Prepared',cases.length,'cases; no UI actions performed');
