const fs=require('fs'),path=require('path');
const timing=new Set(['G8-01','G8-04','G8-05','G12-14','G12-15']);
const model=new Set(['G1-04','G1-07','G3-03','G3-04','G3-05','G5-01','G5-02','G5-03','G6-04','G7-12','G8-06','G8-07','G8-08','G8-09','G8-10','G9-10','G10-07','G10-08','G11-07','G11-09','G11-10','G12-10','G12-11']);
const deps={
 'G3-01':['G2-02'],'G3-02':['G2-02'],'G3-03':['G3-02'],'G3-04':['G3-03'],'G3-05':['G3-03'],'G3-06':['G2-02'],'G3-07':['G3-06'],'G3-08':['G2-02'],
 'G5-01':['G4-02'],'G5-02':['G5-01'],'G5-03':['G5-01'],'G5-04':['G4-02'],'G5-05':['G5-04'],'G5-06':['G4-02','G5-05'],
 'G6-04':['G6-03'],'G6-06':['G6-05'],'G6-08':['G6-07'],
 'G7-05':['G7-04'],'G7-09':['G7-02'],'G7-13':['G7-12'],
 'G8-09':['G8-06'],'G8-10':['G8-06'],
 'G9-10':['G9-09'],
 'G10-01':['G9-12'],'G10-02':['G9-12'],'G10-03':['G9-12'],'G10-04':['G9-12'],'G10-05':['G9-12'],'G10-06':['G9-12'],'G10-07':['G9-12'],'G10-08':['G9-12'],'G10-09':['G9-12'],
 'G11-05':['G11-04'],'G11-07':['G11-06'],'G11-08':['G11-04'],'G11-09':['G11-08'],'G11-10':['G11-09'],'G11-11':['G11-04'],'G11-12':['G11-04'],
 'G12-03':['G12-02'],'G12-11':['G12-10'],'G12-13':['G12-12'],
 'G13-07':['G9-01'],'G13-08':['G9-01'],'G13-09':['G9-01'],'G13-10':['G9-01'],
 'G14-02':['G14-01'],'G14-05':['G14-02'],'G14-06':['G14-02']
};
function feature(c){
 const n=Number(c.id.split('-')[1]);
 switch(c.group){
 case'G1':return ['对话与任务',n<=3?'创建与配置':'回复展示',c.title];
 case'G2':return ['技能',n===4||n===5?'搜索':'导入与卡片',c.title];
 case'G3':return ['技能',n>=3&&n<=5?'实际调用':'启用与筛选',c.title];
 case'G4':return ['专家',n<=4?'导入与来源':'详情阅读',c.title];
 case'G5':return ['专家',n<=3?'实际调用':'冲突与异常包',c.title];
 case'G6':return ['设置',{1:'外观',2:'语言',3:'字号',4:'字号',5:'默认权限',6:'默认权限',7:'默认场景',8:'默认场景'}[n],c.title];
 case'G7':return ['对话与任务','附件',c.title];
 case'G8':return ['对话与任务',n<=5?'状态与提醒':n===8?'文件交付':'执行详情',c.title];
 case'G9':return ['技能',n>=12?'图标':n===10?'实际调用':'元数据与校验',c.title];
 case'G10':return ['技能',n<=6?'目录与预览':'外部文件更新',c.title];
 case'G11':return ['专家',n<=3?'元数据兼容':n===4?'详情阅读':n===5?'覆盖导入':n<=7?'内置技能':n<=10?'对话编辑':'外部文件更新',c.title];
 case'G12':return ['设置',({1:'工作步骤',2:'用量展示',3:'用量展示',4:'记忆开关',5:'沉淀开关',6:'实验总开关',7:'开发者模式',8:'快捷键',9:'快捷键',10:'代码工具',11:'代码工具',12:'网页链接',13:'网页链接',14:'繁忙发送',15:'繁忙发送',16:'个人主页',17:'恢复核验'})[n],c.title];
 case'G13':return [n===3||n>=7&&n<=11?'技能':n===4?'专家':n===5?'自动化':n===6?'帮助反馈':n===12?'设置':'对话与任务',({1:'资料菜单',2:'能力菜单',3:'页面入口',4:'创建与导入入口',5:'推荐案例',6:'入口响应',7:'搜索',8:'搜索',9:'启用开关',10:'卡片导航',11:'创建入口',12:'内置插件',13:'会话搜索',14:'会话排序'})[n],c.title];
 case'G14':return ['技能','ZIP导入',c.title];
 default:throw Error('unknown group '+c.group);
 }
}
const objectByGroup={G1:'本轮任务session id',G2:'本轮技能内部name/安装目录',G3:'本轮技能内部name+调用session id',G4:'本轮专家内部name/安装目录',G5:'本轮专家内部name+实际安装文件/调用session id',G6:'设置字段+受影响新任务session id',G7:'本轮附件草稿session id+完整文件名',G8:'本轮任务session id+工具调用id',G9:'本轮变体内部name+实际安装目录',G10:'rich内部name+实际安装文件路径',G11:'本轮专家内部name+实际安装文件路径',G12:'设置字段+本轮任务session id/目标URL',G13:'当前frame/菜单或本轮对象内部name',G14:'ZIP哈希+候选内部name+安装目录'};
function review(input,root){
 const all=JSON.parse(JSON.stringify(input));
 for(const c of all){
  c.contract_version='2.0';c.feature_path=feature(c);c.depends_on=deps[c.id]||[];
  c.object_identity=objectByGroup[c.group];
  c.runability={kind:timing.has(c.id)?'timing-dependent':model.has(c.id)?'model-dependent':['G12-12','G12-13'].includes(c.id)?'local-host':'stable-ui-or-file',
    guarantee:'在已接入且可恢复的当前环境中可实际尝试；业务成功与全部下游断言可达不作保证',
    prerequisite_failure:'先记录实际尝试与已知差异；无法观察的下游断言actual=null并指出失败依赖，不能伪造通过或把记录完成写成业务验证完成'};
  c.preconditions=[...new Set([...(c.preconditions||[]),'CDP+Playwright已核验当前实例；使用标准/low及已有项目','已创建唯一后缀夹具并记录哈希；相关初值及对象身份已从本轮读取',...(c.depends_on.length?['依赖case的相关样本/场景实际存在；依赖失败时先按独立重建规则尝试，不照抄旧结果']:[])])];
  c.wait={ui_ms:5000,model_ms:90000,locator_corrections:1,terminal:'目标控件/预览稳定、明确提交成功/拒绝/保存失败，或本轮任务明确终态；超时保存实际状态'};
  for(const a of c.assertions){a.evidence_contract={identity:c.object_identity,raw:'记录真实原始文本/属性/字段/路径；布尔聚合须保存组成值与计算依据',normalization:'只按read定义规范化；不添加宽松同义替换或删除额外输出',absence:'对象不存在时记录真实false/0/空列表；对象无法读取时null+reason'};}
 }
 const get=id=>all.find(c=>c.id===id);
 get('G7-08').steps=['在独立空白草稿添加夹具attachments/fast-assert-long-filename-for-layout-and-tooltip-complete-name-regression.txt，悬停卡片；只读该卡tooltip/title。'];
 get('G7-10').steps=['切回G7-01的三文件草稿；若状态已变则先清空并重新添加a.txt/b.txt/c.md；确认before名列表正好为三项后移除attachment-b.txt。'];
 get('G7-11').steps=['另建三文件草稿，确认before正好a.txt/b.txt/c.md；只在附件区域查找清空入口，存在则点击；缺失记录false且保留实际数量，不代用逐个移除冒充清空功能。'];
 get('G9-10').steps=['复用G9-09已导入的minimal，不重复导入；如对象没有导入成功则独立尝试一次导入，记录原因。显式使用“请执行此技能固定回复规则”，请求不含答案。'];
 get('G8-02').depends_on=[];get('G8-02').steps=['创建本轮A任务并让其完成短文本回显，记录session id和最终正文；切另一空白任务B，从A菜单手动标未读；保存A提醒before。','进入A并查看最后回复，读取提醒与历史正文；本case不依赖后台运行时长。'];
 get('G8-03').depends_on=['G8-02'];get('G8-03').steps=['沿用已完成且已读的本轮A，切B后从A菜单标记未读；回读A行标记数量，最后进入A清除。'];
 get('G11-09').steps=['在longread编辑会话发送：仅提出将此专家metadata.json的displayDescription.zh改为FAST_EDITED的方案，暂不写入任何文件，等待我确认。提交前读取两安装文件SHA256；终态后对同一路径读取SHA256和方案正文。'];
 get('G11-10').steps=['在G11-09会话明确确认：仅将本轮longread的displayDescription.zh改为FAST_EDITED，其他字段与文件不变。读取实际安装JSON字段和摘要。然后按同流程恢复已记录原描述，独立回读字段。'];
 get('G12-10').steps=['先记录代码工具初值，再开启并等待保存。创建本轮code-on.js字节为module.exports = 0;；新任务输入“只把此绝对路径文件完整内容改为module.exports = 1;（可带末尾换行），随后读取确认；不改其他文件”。读取实际文件UTF8 trim和当前任务Trace入口。'];
 get('G12-11').steps=['关闭代码工具并等待保存；另一新任务对code-off.js执行G12-10相同精确请求。读取实际文件与Trace；按初值恢复代码工具并重开读取。写入行为按当前待审观察基线比较，不擅自推定关闭应禁止全部写入。'];
 const detail=get('G13-05').assertions[0];detail.operator='equals';detail.expected='$automation_prompt_expected';detail.read='点击前读取所选案例实际任务提示词字段绑定automation_prompt_expected（若只有标题则用完整标题），点击后读取composer纯文本trim，精确比较；只可规范CRLF';
 for(const id of ['G11-09','G11-10'])for(const a of get(id).assertions)if(a.target.includes('摘要')){a.operator='contains';a.expected='displayDescription.zh';a.read='读取本轮助手摘要正文trim，不从用户气泡取值';}
 // Preserve IDs for cross references; timing cases are registered separately.
 const cases=all.filter(c=>!timing.has(c.id)),optional=all.filter(c=>timing.has(c.id));
 fs.writeFileSync(path.join(root,'用例/可选-时序专项.json'),JSON.stringify(optional,null,2)+'\n');
 const grouped=new Map();for(const c of cases){const [l1,l2]=c.feature_path;if(!grouped.has(l1))grouped.set(l1,new Map());const sub=grouped.get(l1);if(!sub.has(l2))sub.set(l2,[]);sub.get(l2).push(c);}
 let doc='# 自顶向下功能树\n\n功能树用于理解覆盖；G编号是共享执行场景，不是功能层级。所有case另含feature_path（一级功能/二级功能/检查点）。本轮必跑140条，可选时序5条不计入必跑完成率。\n\n先按一级入口确认可见，再按场景顺序执行，避免先深挖某一功能。\n';
 for(const [l1,sub] of grouped){doc+='\n## '+l1+'\n';for(const [l2,cs] of sub){doc+='\n### '+l2+'\n\n';for(const c of cs)doc+='- '+c.id+' '+c.title+'\n';}}
 fs.writeFileSync(path.join(root,'功能树.md'),doc);
 return {cases,optional};
}
module.exports={review};
