const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..'),old=path.resolve(root,'../2026-10-06-确定可执行回归');const src=JSON.parse(fs.readFileSync(path.join(old,'用例/cases.json'),'utf8'));
if(fs.existsSync(path.join(root,'结果'))&&fs.readdirSync(path.join(root,'结果')).some(f=>f.endsWith('.json')))throw Error('Execution records exist; do not rebuild this task contract');
const contracts={
'G1-01':[['新任务编辑器','读取可见且可编辑状态','equals',true]],
'G1-02':[['当前任务模型与推理等级','读取两个选中标签','equals',['标准','low']]],
'G1-03':[['当前任务项目','读取已选项目名；来自已有项目列表','equals','$project']],
'G1-04':[['本轮纯文本助手气泡','读取仅助手最终正文并trim','equals','FAST_CHAT_OK']],
'G1-05':[['上一任务状态','读取可见运行中指示数量','equals',0]],
'G1-06':[['纯文本会话产物区','读取文件产物卡片数量，不从全页查文件词','equals',0]],
'G1-07':[['本轮代码块','读取code.textContent并规范CRLF为LF、trim末尾换行','equals','A\nB']],
'G1-08':[['代码块会话产物区','读取文件产物卡片数量','equals',0]],
'G2-01':[['技能导入弹窗','读取文件input数量','greater_than',0]],
'G2-02':[['本轮技能卡','按唯一内部name/详情身份核对对象存在','equals',true]],
'G2-03':[['本轮技能标题','读取卡片标题','equals','本轮快速回归技能']],
'G2-04':[['英文唯一词搜索结果','读取匹配本轮内部name的卡片数','equals',1]],
'G2-05':[['描述唯一词搜索结果','读取匹配本轮内部name的卡片数','equals',1],['本轮技能标题','读取标题是否含description搜索词','equals',false]],
'G2-06':[['本轮技能版本','读取版本，去掉展示前缀v','equals','1.2.3']],
'G2-07':[['本轮技能来源','读取来源标签','equals','用户创建']],
'G2-08':[['技能详情SKILL.md','读取完整正文规则，不只查文件名','contains','reply exactly FAST_SKILL_EXEC_OK']],
'G3-01':[['刚导入技能开关','任何切换前读取aria-checked布尔值','equals',false]],
'G3-02':[['本轮技能开关','设置启用后读取aria-checked','equals',true]],
'G3-03':[['新会话技能引用','读取引用的内部name','equals','$skill_name'],['调用会话身份','比较新会话id与此前活动id不同','different',null]],
'G3-04':[['本轮调用Trace','读取skill_content资源名列表或成功skill工具name列表；无成功工具时不能引用错误name','contains','$skill_name']],
'G3-05':[['本轮技能调用助手气泡','读取最终正文trim','equals','FAST_SKILL_EXEC_OK'],['本轮用户请求','检查用户请求是否含预期输出串','equals',false]],
'G3-06':[['本轮技能开关','停用后读取aria-checked','equals',false]],
'G3-07':[['唯一查询+未启用结果','读取本轮样本匹配数','equals',1],['唯一查询+已启用结果','读取本轮样本匹配数','equals',0]],
'G3-08':[['技能搜索框','读取value','equals',''],['全部列表本轮对象','读取存在状态','equals',true],['本轮技能最终开关','读取aria-checked','equals',false]],
'G4-01':[['专家导入弹窗','读取webkitdirectory file input数量','greater_than',0]],
'G4-02':[['本轮专家卡','按内部name核对存在状态','equals',true]],
'G4-03':[['本轮专家来源与运行类型','读取两个字段','equals',['我创建的','本地运行']]],
'G4-04':[['本轮专家名称与版本','读取标题及去v前缀版本','equals',['本轮快速回归专家','1.2.3']]],
'G4-05':[['本轮专家提示词正文','读取完整规则','contains','return exactly FAST_EXPERT_EXEC_OK']],
'G4-06':[['专家提示词面板','读取可编辑元素数量（textarea/contenteditable=true）','equals',0]],
'G4-07':[['专家推荐问题','读取问题文本列表','equals',['请执行你的本轮回归固定回复规则。']]],
'G4-08':[['本轮详情目录入口','读取打开文件夹按钮数量，不实际打开','equals',1]],
'G5-01':[['本轮新会话专家引用','读取chip资源名','equals','$expert_resource']],
'G5-02':[['本轮专家Trace','读取成功注入资源名列表','contains','$expert_resource']],
'G5-03':[['专家助手最终正文','读取正文trim','equals','FAST_EXPERT_EXEC_OK'],['本轮用户请求','检查是否含预期输出串','equals',false]],
'G5-04':[['同名冲突弹窗','读取覆盖与副本两选项是否同时存在','equals',true]],
'G5-05':[['原专家与副本实际安装目录','分别读取完整绝对路径','different',null],['副本实际目录','读取agent.md与metadata.json均存在状态','equals',true]],
'G5-06':[['原安装专家agent.md实际绝对路径','副本导入前后对同一已安装文件计算SHA256，不使用导入源包','sha256_equal',null],['原安装专家metadata.json实际绝对路径','副本导入前后对同一已安装文件计算SHA256','sha256_equal',null]],
'G5-07':[['缺文件包提交反馈','读取是否明确拒绝','equals',true],['专家列表数量','读取该坏包提交前后总数','same_value',null]],
'G5-08':[['坏JSON提交反馈','读取是否明确拒绝','equals',true],['专家列表数量','读取该坏包提交前后总数','same_value',null],['坏包源metadata.json绝对路径','提交前后对同一源文件计算SHA256','sha256_equal',null],['坏包源agent.md绝对路径','提交前后对同一源文件计算SHA256','sha256_equal',null]],
'G6-01':[['本轮主题影响表面','读取改前后同一表面computed background-color不同','different',null],['主题保存','重开设置读取选中值','equals','$theme_changed'],['主题恢复','恢复后独立读取选中值','equals','$theme_initial']],
'G6-02':[['设置导航语言','English下读取常规项显示','equals','General'],['语言恢复','恢复后读语言标签','equals','$language_initial']],
'G6-03':[['重开设置字号','读取数字值','equals','$font_changed']],
'G6-04':[['新会话助手正文字号','读取computed font-size数字值','equals','$font_changed'],['恢复后同一正文字号','读取computed font-size数字值','equals','$font_initial']],
'G6-05':[['重开设置默认权限','读取选中值','equals','仅可查看']],
'G6-06':[['改后新空白任务权限','读取权限标签规范化值','equals','仅可查看'],['恢复后默认权限设置','独立读取选中值','equals','$permission_initial'],['恢复后另一个新任务权限','不手工更改当前任务标签，读取新任务权限','equals','$permission_initial']],
'G6-07':[['切PTC后的新任务场景','读取场景标签','equals','PTC模式']],
'G6-08':[['恢复后的另一个新任务场景','读取场景标签','equals','$scene_initial']]
};
const cases=src.map(c=>({...c,prior_task:'2026-10-06-确定可执行回归',assertions:contracts[c.id].map(([target,read,operator,expected],i)=>({id:c.id+'-A'+(i+1),target,read,operator,expected})),evidence_required:['原始动作/读取日志，断言关联read event及运行时actual','关键变化截图可共享；证据用于回溯，不代替断言']}));
for(const d of ['用例','夹具','结果','证据','运行日志'])fs.mkdirSync(path.join(root,d),{recursive:true});
for(const d of ['skill-template','expert-template','expert-missing-agent','expert-bad-json']){const dest=path.join(root,'夹具',d);fs.mkdirSync(dest,{recursive:true});for(const f of fs.readdirSync(path.join(old,'夹具',d)))fs.writeFileSync(path.join(dest,f),fs.readFileSync(path.join(old,'夹具',d,f)));}
for(const d of ['skill-template','expert-template'])for(const f of fs.readdirSync(path.join(root,'夹具',d))){const p=path.join(root,'夹具',d,f);fs.writeFileSync(p,fs.readFileSync(p,'utf8').replaceAll('fast-reg-','fast-assert-'));}
const extensionFile=path.join(root,'用例/扩展-cases.json');const all=fs.existsSync(extensionFile)?cases.concat(JSON.parse(fs.readFileSync(extensionFile,'utf8'))):cases;
const reviewed=require('./review-contracts.cjs').review(all,root);fs.writeFileSync(path.join(root,'用例/cases.json'),JSON.stringify(reviewed.cases,null,2)+'\n');console.log('Prepared',reviewed.cases.length,'mandatory cases',reviewed.cases.reduce((n,c)=>n+c.assertions.length,0),'assertions; no UI execution');
