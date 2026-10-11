// Preparation only. Does not connect to or operate TPT Work.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),old=path.resolve(root,'../2026-10-05-需求用例全量探索');
if(fs.existsSync(path.join(root,'结果'))&&fs.readdirSync(path.join(root,'结果')).some(f=>f.endsWith('.json')))throw Error('Execution records exist; do not rebuild this task contract');
const source=JSON.parse(fs.readFileSync(path.join(old,'用例/cases.json'),'utf8')).concat(JSON.parse(fs.readFileSync(path.join(old,'用例/extra-cases.json'),'utf8')));
const extra=[];
function add(group,title,prior,steps,checks,fixture){
  const id=group+'-'+String(extra.filter(c=>c.group===group).length+1).padStart(2,'0');
  const original=source.find(c=>c.id===prior);
  const record=path.join(old,'执行记录',prior+'.json');
  const historical=fs.existsSync(record)?JSON.parse(fs.readFileSync(record,'utf8')):null;
  extra.push({id,group,group_title:titles[group],title,steps,expected:checks.map(x=>x[0]+'：'+JSON.stringify(x[3])),fixture,
    prior_task:'2026-10-05-需求用例全量探索',prior_case:prior,
    prior_attempt:historical?.latest_attempt_id||null,source:original?.source||null,
    basis:original?'需求文档对应检查点；历史只证明操作路径可尝试，不作为本轮答案':'可逆设置/交互契约；新增细分检查',
    assertions:checks.map(([target,read,operator,expected],i)=>({id:id+'-A'+(i+1),target,read,operator,expected})),
    evidence_required:['本轮真实动作/读取日志；断言引用read event；比较包含before/after','关键变化截图可共享，证据哈希登记；恢复独立回读'],
    cleanup:'恢复设置原值；仅恢复本轮fast-assert-资产；导入技能结束停用，专家保留待审；不删除用户资产。'});
}
const titles={G7:'附件',G8:'任务与执行详情',G9:'技能字段与图标',G10:'技能详情与更新',G11:'专家扩展',G12:'设置扩展',G13:'一级入口与菜单',G14:'技能包结构'};
const eq=(t,r,e)=>[t,r,'equals',e],has=(t,r,e)=>[t,r,'contains',e],same=(t,r)=>[t,r,'same_value',null],sha=(t,r)=>[t,r,'sha256_equal',null],diff=(t,r)=>[t,r,'different',null];
function c(g,t,p,s,a,f){add(g,t,p,Array.isArray(s)?s:[s],a,f||'见扩展场景与夹具说明');}

c('G7','三文件顺序','DIALOG-014','新空白任务以setInputFiles一次选择attachment-a.txt、attachment-b.txt、attachment-c.md；等待卡片稳定。',[eq('当前草稿附件名顺序','只读取composer附件卡片完整文件名列表',['attachment-a.txt','attachment-b.txt','attachment-c.md'])],'夹具/扩展/attachments');
c('G7','30附件边界','DIALOG-015','另一空白任务一次选择count-01.txt至count-30.txt。',[eq('当前草稿附件数','只数当前composer附件卡',30),eq('附件数量提示','读取是否显示30/30，规范空格后比较',true)]);
c('G7','超额整批拒绝','DIALOG-016','另一空白任务添加01至20；保存卡片名列表；再一次提交21至35。',[same('当前草稿附件完整文件名列表','记录第二批提交前后列表'),eq('超额提示','读取提示是否明确本批超额且剩余可加10个',true)]);
c('G7','图片缩略图','DIALOG-019','空白任务添加preview.png。',[eq('preview.png附件图像','读取img.complete且naturalWidth>0布尔值',true)]);
c('G7','图片整屏预览','DIALOG-019','点击preview.png缩略图，观察后关闭预览。',[eq('图片预览层','读取可见预览层和加载完成图像同时存在',true),eq('关闭后的图片预览层','独立读取可见状态',false)]);
c('G7','普通文件识别','DIALOG-020','添加attachment-a.txt，读取当前附件卡。',[eq('attachment-a.txt卡片','读取完整文件名','attachment-a.txt'),eq('普通文件图标','读取卡片内文件图标存在',true)]);
c('G7','未知格式','DIALOG-021','添加fixture.unknown-fast；不要求模型解析。',[eq('未知格式附件卡','读取当前草稿匹配文件名卡片数',1),eq('未知格式卡片解析声明','读取卡片是否宣称解析成功',false)]);
c('G7','长文件名完整回读','DIALOG-022','添加long-name夹具；悬停卡片，读取tooltip/title。',[eq('长文件名完整提示','读取悬停tooltip或title完整名称','$attachment_long_name')]);
c('G7','附件区内部滚动','DIALOG-023','使用已有30卡片草稿，定位附件容器并滚到底；不滚整页代替。',[eq('附件容器可滚动','读取scrollHeight>clientHeight且overflow允许滚动布尔值',true),eq('最后附件可见','滚到底后读取count-30.txt可见状态',true)]);
c('G7','移除单附件','DIALOG-024','三文件草稿移除attachment-b.txt。',[eq('剩余附件名列表','读取composer卡片名顺序',['attachment-a.txt','attachment-c.md'])]);
c('G7','清空多附件','DIALOG-025','三文件草稿查找附件区域清空入口；存在则点击，缺失记录false，不代用逐个删除冒充清空。',[eq('附件清空入口','读取限定附件区域的可见可操作入口存在',true),eq('清空后的草稿附件数','实际点击后读取；无入口则保留实际非零数量',0)]);
c('G7','发送附件固定','DIALOG-027','在专用任务添加a.txt并提交“只回复附件已收到，不读取其他文件”；等待终态，尝试只读检查已发送用户气泡。',[eq('已发送气泡附件','读取attachment-a.txt存在',true),eq('已发送附件删除入口','读取已发送气泡内删除按钮数量',0)]);
c('G7','新轮附件独立','DIALOG-017','沿用已发送单附件任务，第二轮草稿添加b.txt/c.md；先读，不必提交。',[eq('第二轮待发送附件列表','仅读取composer附件名',['attachment-b.txt','attachment-c.md'])]);
c('G7','附件状态清理','DIALOG-024','清空本轮剩余草稿附件和文字，关闭预览。',[eq('当前草稿附件数','读取当前composer',0),eq('当前草稿文字','读取编辑器纯文本trim','')]);

c('G8','后台完成与会话隔离','DIALOG-002',['准备本轮A/B两任务；B先回显唯一B标记，绑定dialog_b_marker。','A请求生成编号1至150的短行，确认运行后切回B；等待A终态，回读侧栏A及B最终正文。'],[eq('后台A完成提醒','读取A行存在未读完成提醒',true),eq('B助手正文','读取B最后助手正文trim','$dialog_b_marker')]);
c('G8','阅读清除提醒','DIALOG-003','进入完成的A并查看最后回复。',[eq('A未读提醒','读取同一A侧栏行未读提醒数量',0),eq('A历史正文可访问','读取非空最终正文',true)]);
c('G8','手动未读复用','DIALOG-004','切B后对本轮A菜单标记未读，回读A；最后进入A清除。',[eq('A完成未读提醒数','读取A行完成未读提醒数量',1),eq('A重复独立未读标记数','读取并列额外标记数量',0)]);
c('G8','运行状态与终态清理','DIALOG-005','专用任务请求生成200行；发送后立即观察运行状态，等待结束。',[eq('运行阶段任务指示','读取停止生成控件或侧栏运行标记可见',true),eq('结束后进行中标记数','只读取同一任务进行中指示',0)]);
c('G8','主动终止','DIALOG-008','新任务请求生成500行；出现运行状态即点停止；等待终态，记录终止前后的任务身份。',[eq('终止操作是否提交','读取点击动作日志及按钮目标同一任务的布尔值',true),eq('终止任务状态','从任务详情读取明确终止/已停止语义',true),eq('终止后运行指示数','只读该任务',0)]);
c('G8','执行详情实际路径','DIALOG-040',['建立本轮绝对目录与flow.txt，内容FAST_FLOW_INPUT；绑定flow_file。','任务请求只读取此绝对文件，原样回答；读取Trace展开的read输出。'],[has('成功读取工具的路径列表','读取成功工具实际参数路径','$flow_file'),has('成功read输出','读取该工具实际输出','FAST_FLOW_INPUT')]);
c('G8','长工具输出可滚动','DIALOG-041','同目录创建long.txt（200行），请求只读它；展开实际read输出并滚动输出容器。',[eq('工具输出内部滚动','读取输出容器scrollHeight>clientHeight且允许滚动',true),has('实际read输出末行','读取工具完整输出','FAST_LONG_LINE_200')]);
c('G8','明确文件交付','DIALOG-043','任务请求在本轮绝对目录写deliver.txt内容FAST_DELIVER_OK，并明确将该文件作为最终交付；不能只检查模型声称已写。',[eq('实际deliver.txt文件内容','从本轮工作目录读取UTF8 trim','FAST_DELIVER_OK'),eq('当前任务产物文件身份','从产物卡实际资源路径读取与deliver.txt绝对路径相等布尔值',true)]);
c('G8','终态折叠与详情回读','DIALOG-032','沿用完成的read/write任务，观察工作步骤结束默认折叠，再展开。',[eq('完成工作步骤默认折叠','读取该面板aria-expanded是否false',true),eq('展开后执行记录可读','读取至少一条实际工具记录可见',true)]);
c('G8','单动作不过度聚合','DIALOG-039','沿用只有一次read调用的任务，在展开步骤中读取嵌套聚合层级。',[eq('单read多层聚合','读取是否存在至少两层同类聚合嵌套',false)]);

// Fresh variants avoid relying on old installed assets.
const variantDefs=[
 ['cn-all','SKILL-021','中文名称优先','name_cn','本轮中文优先'],
 ['cn-en','SKILL-022','中文回退英文名','name_en','Fast English Fallback'],
 ['cn-tech','SKILL-022','中文回退技术名','name',null],
 ['en-cn','SKILL-023','英文回退中文名','name_cn','本轮英文缺省'],
 ['desc-en','SKILL-024','中文描述回退英文','description_en','FAST_DESCRIPTION_EN'],
 ['desc-tech','SKILL-024','中文描述回退技术描述','description','FAST_DESCRIPTION_BASE']
];
for(const [key,prior,title,field,value] of variantDefs)c('G9',title,prior,`导入variants/${key}/SKILL.md；${key==='en-cn'?'保存语言原值后切English并查看详情，最后恢复':'使用中文界面查看卡片/详情'}。`,[eq(key.startsWith('desc')?'本轮样本描述':'本轮样本标题','读取该样本实际展示文本',value||'$variant_cn_tech_name')],`夹具/扩展/variants/${key}`);
c('G9','缺技术name拒绝','SKILL-025','记录技能列表身份集合；导入missing-name单文件。',[eq('缺name导入反馈','读取明确校验拒绝',true),same('技能列表内部身份集合','提交前后读取排序后的完整身份列表')],'夹具/扩展/variants/missing-name');
c('G9','缺技术description拒绝','SKILL-026','记录列表身份集合；导入missing-description单文件。',[eq('缺description导入反馈','读取明确校验拒绝',true),same('技能列表内部身份集合','提交前后读取排序后的完整身份列表')],'夹具/扩展/variants/missing-description');
c('G9','可选字段不空占位','SKILL-027','导入minimal单文件，打开详情。',[eq('空可选字段占位','限定标签/版本/作者/推荐问题区域读取是否出现空字段行',false)],'夹具/扩展/variants/minimal');
c('G9','无版本可导入调用','SKILL-028','导入minimal，显式使用“请执行此技能固定回复规则”；请求不含答案。',[eq('minimal助手正文','读取本轮最终正文trim','FAST_MINIMAL_OK'),eq('用户请求含输出串','读取实际用户请求是否含FAST_MINIMAL_OK',false)]);
c('G9','伪market来源规范','SKILL-029','导入declared-market单文件并查看来源。',[eq('本地声明market样本来源','读取来源规范化标签','用户创建'),eq('本地样本市场关联','读取对象详情是否有可信市场关联',false)],'夹具/扩展/variants/declared-market');
c('G9','合法包内PNG显示','SKILL-032','导入rich.zip，读取其卡片图标。',[eq('rich包图标加载','读取图标img.complete且naturalWidth>0',true),eq('rich图标资源来自该安装包','从实际src解码/资源身份判断属于本轮安装目录',true)],'夹具/扩展/zips/rich.zip');
c('G9','缺图标正常降级','SKILL-033','导入missing-icon.zip，回读卡片与详情。',[eq('缺图标包存在','读取本轮对象存在',true),eq('缺图标包降级图标','读取默认图标显示且不存在broken image',true)],'夹具/扩展/zips/missing-icon.zip');
c('G9','伪PNG不当有效图片','SKILL-034','导入bad-png.zip；打开图标/详情，限定该对象检查。',[eq('伪PNG被作为有效图像','读取该图像complete且naturalWidth>0',false),eq('伪PNG默认图标降级','读取可见默认图标',true)],'夹具/扩展/zips/bad-png.zip');
c('G9','网络图标不请求','SKILL-037','在导入前监听HTTP请求；导入network-icon.zip，打开卡片与详情；网络URL为本地夹具源，不连接外部服务。',[eq('网络icon实际请求数','读取本轮监听中匹配该icon完整URL的请求数',0)],'夹具/扩展/zips/network-icon.zip');

c('G10','默认打开SKILL正文','SKILL-039','打开本轮rich技能详情。',[eq('详情初始选中文件','读取选中树节点路径','SKILL.md'),has('默认预览完整正文','读取文件预览文本','FAST_RICH_BASE_OK')]);
c('G10','深层文件可达','SKILL-040','展开references/handbook/advanced，选择checklist.md。',[has('深层文件预览','读取所选文件正文','FAST_DEEP_CHECKLIST')]);
c('G10','目录可折叠','SKILL-040','收起references目录并读取子节点可见状态，再展开恢复。',[eq('收起后的深层节点可见','读取checklist.md树节点可见状态',false),eq('恢复展开深层节点可见','读取同一节点可见状态',true)]);
c('G10','文本JSON只读','SKILL-041','分别点notes.txt与records.json，读取正文和可编辑控件。',[has('notes预览正文','读取文件文本','FAST_NOTES'),has('JSON预览正文','读取文件文本','FAST_JSON'),eq('文件预览可编辑控件数','限定预览区数textarea/contenteditable=true',0)]);
c('G10','图片预览','SKILL-042','点assets/icon.png。',[eq('包内图片预览加载','读取实际预览img.complete且naturalWidth>0',true)]);
c('G10','二进制不虚构解析','SKILL-043','点data/sample.bin。',[eq('二进制文件说明','读取名称/类型/大小说明均存在',true),eq('二进制正文解析声称','读取是否宣称已解析出业务内容',false)]);
c('G10','合法外部修改生效','SKILL-045',['从详情定位本轮实际安装SKILL.md，备份字节与哈希。','只替换固定输出FAST_RICH_BASE_OK为FAST_RICH_NEW_OK；新建任务显式选择该技能调用固定规则；最后恢复并回读。'],[eq('合法修改后的新任务正文','读取最终正文trim','FAST_RICH_NEW_OK'),has('新任务加载技能资源内容','读取成功加载的skill_content正文','FAST_RICH_NEW_OK'),sha('本轮实际安装SKILL.md绝对路径','初始与恢复后对同一文件读取SHA256')]);
c('G10','无效修改保留最近有效内容','SKILL-046','备份rich安装文件；移除技术description使之无效；通过UI打开/使用样本观察校验；新任务调用固定规则；最终恢复。',[eq('无效文件校验提示','读取提示明确无效字段或校验失败',true),eq('无效修改后的固定回复','读取最终正文trim','FAST_RICH_BASE_OK'),sha('本轮实际安装SKILL.md绝对路径','初始与恢复后SHA256')]);
c('G10','修改后不增加本地修改标签','SKILL-048','沿用合法修改时的本轮user对象，读取卡片标签；不把user来源扩展为市场版本结论。',[eq('本轮卡片已本地修改标签','读取限定卡片标签列表中该标签存在',false)]);

c('G11','缺可选字段兼容','AGENT-016','导入minimal专家目录，只含name/description与agent.md。',[eq('minimal专家存在','按本轮内部name读取对象存在',true)],'夹具/扩展/experts/minimal');
c('G11','英文简介中文回退','AGENT-007','中文下导入en-description专家，查看简介。',[eq('en-description实际简介','读取详情简介纯文本','FAST_EXPERT_DESCRIPTION_EN')],'夹具/扩展/experts/en-description');
c('G11','技术简介最终回退','AGENT-007','导入base-description专家，查看中文简介。',[eq('base-description实际简介','读取简介纯文本','FAST_EXPERT_DESCRIPTION_BASE')],'夹具/扩展/experts/base-description');
c('G11','长提示词末尾完整','AGENT-021','导入longread，打开详情，滚动提示词至底部。',[has('长提示词完整正文','读取该提示词完整DOM文本','FAST_PROMPT_END'),eq('末尾标记可见','滚到底后读取末尾标记可见',true)],'夹具/扩展/experts/longread');
c('G11','覆盖本轮对象','AGENT-019','备份本轮longread原安装文件；导入同name而描述带FAST_OVERWRITE的目录选覆盖；读详情及实际文件；结束恢复原字节并刷新。',[has('覆盖后实际metadata内容','读取安装metadata.json','FAST_OVERWRITE'),has('覆盖后详情描述','读取本轮详情描述','FAST_OVERWRITE'),sha('本轮原安装metadata.json绝对路径','覆盖前与恢复后SHA256')],'夹具/扩展/experts/overwrite');
c('G11','专家附带Skill独立保存','AGENT-020','导入bundled专家目录；通过详情确定安装目录，检查实际skills文件，并记源文件哈希。',[eq('实际安装附带SKILL.md','读取本轮安装skills/bundled/SKILL.md存在',true),diff('源包与安装附带Skill文件路径','分别读取两个完整绝对路径')],'夹具/扩展/experts/bundled');
c('G11','附带Skill实际调用','AGENT-020','从本轮bundled专家使用入口建新任务，请求执行内置技能固定规则，不含答案。',[has('本轮成功加载资源正文','读取Trace成功skill资源正文','FAST_BUNDLED_OK'),eq('本轮助手正文','读取最终正文trim','FAST_BUNDLED_OK'),eq('请求含输出串','读取实际用户请求是否含FAST_BUNDLED_OK',false)]);
c('G11','编辑上下文','AGENT-026','从longread详情点击对话编辑，仅观察不提交。',[eq('专家编辑引用身份','读取composer明确指向本轮longread对象',true),eq('专家编辑模式','读取编辑模式语义标识存在',true),eq('左侧导航保留','读取左侧导航可见',true)]);
c('G11','确认前文件不变','AGENT-027','记录longread安装agent.md/metadata.json哈希；请求仅提出将displayDescription.zh改为FAST_EDITED的方案，明确暂不写盘；等待回答。',[sha('本轮安装agent.md绝对路径','提方案前后SHA256'),sha('本轮安装metadata.json绝对路径','提方案前后SHA256'),eq('待确认摘要','读取助手说明待确认且指明修改字段',true)]);
c('G11','确认后写盘与摘要','AGENT-028','沿用方案会话，明确确认仅修改本轮displayDescription.zh；读工具成功输出、实际文件及详情；同流程恢复原字段值。',[eq('修改后metadata.displayDescription.zh','读取实际安装JSON字段','FAST_EDITED'),eq('修改摘要字段正确','读取助手摘要明确displayDescription.zh',true),eq('恢复后metadata描述','读取同一字段','$expert_longread_description_initial')]);
c('G11','外部修改刷新','AGENT-029','备份longread安装agent.md；末尾追加FAST_EXTERNAL_REFRESH，重新打开详情/使用页面刷新入口；结束恢复。',[has('刷新后提示词正文','读取详情完整正文','FAST_EXTERNAL_REFRESH'),sha('本轮安装agent.md绝对路径','修改前与恢复后SHA256')]);
c('G11','坏配置不被自动改写','AGENT-030','备份longread安装metadata.json；写入明确无效JSON“{ invalid”；保存坏文件哈希，刷新详情；然后恢复原字节并重开确认。',[eq('坏JSON校验提示','读取详情明确格式/校验错误',true),sha('本轮坏metadata.json绝对路径','刷新前后坏文件SHA256'),eq('恢复后对象详情可访问','读取有效对象详情存在',true)]);

c('G12','工作步骤偏好保存','OTHER-019','保存工作步骤初值，改另一值；关闭重开设置回读；恢复。',[eq('重开后的工作步骤设置','读取选中值','$work_steps_changed'),eq('恢复后的工作步骤设置','独立回读','$work_steps_initial')]);
c('G12','用量简洁实际效果','OTHER-019','准备已完成对话；保存用量初值切简洁，关设置看同一任务页脚。',[eq('简洁页脚轮次步骤token总量','限定该页脚读取三类详细字段是否全隐藏',true),eq('简洁页脚基本用量','读取tok/s或上下文百分比至少一项仍存在',true)]);
c('G12','用量详细与恢复','OTHER-019','切详细并读同一页脚；恢复原值且重开设置。',[eq('详细页脚字段','读取轮次/步骤/token总量均显示',true),eq('恢复后的用量设置','独立回读选中值','$usage_initial')]);
c('G12','记忆开关保存','OTHER-019','只在设置中保存启用记忆初值，点击反值一次；等待保存完成/明确失败；关设置重开读取并恢复。不得编辑或删除记忆。',[eq('重开后的启用记忆','读取checked布尔值','$memory_changed'),eq('记忆开关保存错误','读取是否出现保存失败提示',false),eq('恢复后的启用记忆','独立读取checked','$memory_initial')]);
c('G12','沉淀开关保存','OTHER-019','同样仅切启用沉淀一次；独立回读并恢复，不执行沉淀任务。',[eq('重开后的启用沉淀','读取checked','$evolution_changed'),eq('沉淀开关保存错误','读取是否出现保存失败提示',false),eq('恢复后的启用沉淀','独立读取checked','$evolution_initial')]);
c('G12','实验总开关保存恢复','OTHER-019','保存初值，切反值，关闭重开设置，恢复；不切体验优化计划。',[eq('重开后的实验总开关','读取checked','$experimental_changed'),eq('恢复后的实验总开关','独立回读','$experimental_initial')]);
c('G12','开发者模式保存恢复','OTHER-019','保存初值，切反值，关闭重开设置，恢复；不调用额外调试业务。',[eq('重开后的开发者模式','读取checked','$developer_changed'),eq('恢复后的开发者模式','独立回读','$developer_initial')]);
c('G12','新建快捷键自定义保存','OTHER-019','保存当前快捷键，改Ctrl+Alt+Shift+F9；关设置重开读取；恢复原组合而非一律恢复默认。',[eq('重开后的新建快捷键','读取规范化组合','Ctrl+Alt+Shift+F9'),eq('恢复后新建快捷键','独立回读','$shortcut_new_initial')]);
c('G12','搜索快捷键运行效果','OTHER-019','保存搜索快捷键值；关闭设置和菜单，焦点BODY；用Playwright按当前配置一次，不重试；读搜索入口；Esc收尾。',[eq('快捷键后的搜索会话输入','限定搜索面板读可见状态',true)]);
c('G12','代码工具开启实际执行','OTHER-019','保存设置初值，开代码工具；本轮工作目录写code-on.js初值0，任务要求只将0改为1并读回；查实际文件和Trace。',[eq('开启态code-on.js实际内容','读取UTF8 trim','module.exports = 1;'),eq('开启态Trace入口','读取任务Trace可见',true)]);
c('G12','代码工具关闭对照','OTHER-019','关闭代码工具；新任务对code-off.js执行同样0改1，读取实际文件；观察Trace入口，再恢复初值。当前产品观察基线为隐藏Trace但仍可写文件，该基线待审核；不将此设置擅自解释为禁止所有写入。',[eq('关闭态Trace入口','读取当前任务Trace可见',false),eq('关闭态code-off.js实际内容','读取UTF8 trim；这是当前产品观察基线，不代表需求已批准','module.exports = 1;'),eq('恢复后代码工具设置','独立读取checked','$code_tools_initial')]);
c('G12','侧栏链接实际路径','OTHER-019','启动tools/link_fixture.py；保存链接设置初值，选应用内侧边栏；任务生成指向本轮URL的Markdown链接；点真实锚点。',[eq('本轮侧栏浏览器','读取应用内浏览器/侧栏面板可见',true),has('本轮URL请求日志','读取夹具真实GET路径列表','$link_path')],'tools/link_fixture.py + 本轮唯一URL');
c('G12','默认浏览器实际路径','OTHER-019','切默认浏览器；点击另一唯一目标链接；读夹具请求日志User-Agent及进程/窗口观察；恢复设置、关闭应用内本轮页、停止夹具。',[eq('默认浏览器User-Agent','读取匹配本轮URL的GET UA是否Chrome且不含Electron',true),eq('恢复后网页链接设置','独立读取选中值','$link_initial')]);
c('G12','排队发送实际时序','OTHER-019','保存繁忙发送初值；选排队；本轮A任务生成200行，观察运行后用Enter提交唯一第二消息；读提交时间、第二消息入对话及两次终态。',[eq('排队第二消息已提交','读取用户气泡唯一标记存在',true),eq('排队任务时序','由原始事件计算第二执行开始时间>=第一终态时间',true)]);
c('G12','插话发送实际加入','OTHER-019','选插话/中断当前对应实际选项并记录标签；新任务运行期间Enter提交唯一第二指令，要求收尾回复FAST_INSERT_OK；读提交与终态；恢复。',[eq('插话第二消息在运行中提交','原始事件计算第二提交时间<首任务终态时间',true),has('插话任务最后回复','读取最终助手正文','FAST_INSERT_OK'),eq('恢复后繁忙发送设置','独立回读','$busy_initial')]);
c('G12','个人主页只读身份','OTHER-018','打开个人主页；读取用户名/用户类型可编辑状态，不更换身份。',[eq('个人身份字段只读','读取用户名与用户类型均disabled/readonly',true)]);
c('G12','设置全项恢复核验','OTHER-019','独立重开设置，逐项回读本轮调整过的设置；与运行初值快照比较；不要只复制恢复动作日志。',[same('本轮可逆设置规范化快照','任务开始与全部恢复后读取同一字段集合')]);

c('G13','@入口资料选项','DIALOG-010','新空白任务输入@；只读取实际弹出菜单，之后清草稿。',[eq('@菜单本地文件入口','读取限定菜单内是否有文件/本地资料入口',true)]);
c('G13','+入口专家选项','DIALOG-011','点击composer +；只读取该菜单，不全页搜索“专家”。',[eq('+菜单专家入口','读取限定菜单内是否有Agent/专家入口',true)]);
c('G13','技能双页签','SKILL-001','打开技能iframe，读取并分别切我的技能与市场，不安装。',[eq('技能双页签','读取两页签均可见可点击',true)]);
c('G13','专家创建与导入入口','AGENT-004','专家页点创建，观察创建会话模式后返回；打开导入dialog后关闭。',[eq('专家创建模式','读取明确创建专家模式',true),eq('专家导入目录input','读取dialog内webkitdirectory文件输入存在',true)]);
c('G13','自动化推荐预填','OTHER-016','打开自动化一级页，选一个推荐案例；记录卡片全文和点击后的composer文本，未预填则失败，不手动填来补通过。',[eq('推荐点击后预填','读取composer非空且包含所选卡片的具体任务要求',true)]);
c('G13','帮助反馈响应','OTHER-021','预先监听顶层/各frame URL、dialog、window.open/外部进程变化；点击帮助与反馈一次；等最多3秒。',[eq('帮助点击有可观察响应','从监听事件判断至少一个明确帮助页面/dialog/外部目标打开',true)]);
c('G13','中文名称搜索','SKILL-003','技能页搜cn-all样本中文名“本轮中文优先”，读取本轮内部name匹配数；结束清空搜索。',[eq('中文查询本轮匹配数','限定结果列表按实际内部身份读取',1)]);
c('G13','标签搜索','SKILL-007','技能页搜FAST_SEARCH_TAG，读取cn-all身份匹配数；结束清空搜索。',[eq('标签查询本轮匹配数','限定结果列表按cn-all内部身份读取',1)]);
c('G13','开关不打开详情','SKILL-011','在本轮cn-all技能列表卡片保存开关值、URL/可见页面，切反值；读取卡片和详情状态；恢复原值。',[eq('切开关后仍为技能列表','读取列表可见且该详情未打开',true),same('cn-all技能开关','切换前与最终恢复后读取checked')]);
c('G13','卡片主体打开详情','SKILL-010','点击cn-all卡片非开关/快捷按钮的主体；读取详情内部name身份，再返回。',[eq('卡片详情对象身份','读取是否为本轮cn-all内部name',true)]);
c('G13','技能创建模式入口','SKILL-065','点击新建技能，读取composer创建模式与左导航；不提交生成。',[eq('技能创建模式','读取明确技能创建模式标识',true),eq('创建页左导航','读取可见状态',true)]);
c('G13','插件详情展开收起','EXTRA-001','设置内置插件页选择一个当前会话插件卡，读取aria-expanded初值，点击展开读取详情，再恢复初始折叠状态。',[eq('插件展开详情','读取同一卡aria-expanded且详情内容非空',true),same('本轮插件卡展开状态','操作前与恢复后读取aria-expanded')]);
c('G13','会话搜索命中','EXTRA-002','仅用本轮会话；从可见搜索入口搜索本轮已确认标题，读取对应session id，清空退出。',[eq('搜索结果本轮会话','按实际session id读取匹配数',1)]);
c('G13','会话排序菜单','EXTRA-003','保存当前排序，打开排序菜单读取选项；只对当前列表选择另一可逆排序，回读菜单选择后恢复；不改会话标题或删除。',[eq('排序更改选中项','读取改后选中值','$sort_changed'),eq('排序恢复选中项','独立回读','$sort_initial')]);

c('G14','ZIP导入确认前不入库','SKILL-069','记录正式技能身份集合；在导入dialog提交root.zip，未点最终确认时读取候选与列表。',[eq('ZIP候选扫描列表','读取候选对象存在',true),same('正式技能身份集合','上传前与最终确认前读取列表')],'夹具/扩展/zips/root.zip');
c('G14','根包只识别一项','SKILL-070','提交root.zip并确认；根和nested/SKILL.md都存在。',[eq('根ZIP正式对象增量','读取导入前后对应本轮技术名对象增量',1),eq('内部嵌套技能拆成全局对象','读取nested技术名全局匹配数',0)]);
c('G14','集合仅扫描一级','SKILL-071','导入collection.zip；含一级合法one和二级deep/two，根无SKILL。',[eq('集合候选内部名列表','读取并排序候选实际技术name','$collection_expected_names')],'夹具/扩展/zips/collection.zip');
c('G14','系统垃圾不落盘','SKILL-072','导入trash.zip；从详情定位实际安装目录，递归读取相对文件列表。',[eq('安装目录垃圾文件','读取__MACOSX路径或.DS_Store存在',false)],'夹具/扩展/zips/trash.zip');
c('G14','同名默认跳过','SKILL-073','记录本轮根包安装SKILL.md哈希，再导入同一root.zip；读取候选冲突默认选择；不强制覆盖。',[eq('同名冲突默认操作','读取候选默认选项规范值','跳过'),sha('已安装本轮root SKILL.md绝对路径','再次提交前后SHA256')]);
c('G14','部分成功隔离','SKILL-074','导入mixed.zip；包含新合法valid、同名root、缺description的invalid；按默认确认，读取逐项和总结果。',[eq('混合导入逐项结果','按候选技术name规范化读取状态：valid成功/root跳过/invalid失败或校验拒绝','$mixed_expected_status'),eq('混合导入无坏包正式卡','读取invalid技术名正式匹配数',0)],'夹具/扩展/zips/mixed.zip');

// Generate immutable templates. prepare-fixtures.py creates run-specific copies.
const froot=path.join(root,'夹具/扩展');fs.mkdirSync(froot,{recursive:true});
function write(p,s){p=path.join(froot,p);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);}
function skill(key,fields={},body='When explicitly invoked, reply exactly FAST_MINIMAL_OK. Do not use tools or external systems.'){
  const data={name:'fast-assert-'+key+'-RUN',description:'FAST_DESCRIPTION_BASE',...fields};
  const yaml=Object.entries(data).filter(([,v])=>v!==null).map(([k,v])=>k+': '+JSON.stringify(v)).join('\n');
  write('variants/'+key+'/SKILL.md','---\n'+yaml+'\n---\n\n'+body+'\n');
}
skill('cn-all',{name_cn:'本轮中文优先',name_en:'Fast English Priority',tags:['FAST_SEARCH_TAG']});
skill('cn-en',{name_en:'Fast English Fallback'});skill('cn-tech');skill('en-cn',{name_cn:'本轮英文缺省'});
skill('desc-en',{description_en:'FAST_DESCRIPTION_EN'});skill('desc-tech');
skill('missing-name',{name:null,name_cn:'本轮缺技术名-RUN',name_en:'Missing Name RUN'});
skill('missing-description',{description:null,description_cn:'缺技术描述RUN'});skill('minimal');skill('declared-market',{type:'market'});
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNw6TiDFTEMLQkAuRFmAZ3Xk4AAAAAASUVORK5CYII=','base64');
write('attachments/preview.png',png);for(const n of ['a','b'])write('attachments/attachment-'+n+'.txt','FAST_ATTACHMENT_'+n.toUpperCase()+'\n');write('attachments/attachment-c.md','# FAST_ATTACHMENT_C\n');
write('attachments/fixture.unknown-fast','Harmless UTF8 fixture');write('attachments/fast-assert-long-filename-for-layout-and-tooltip-complete-name-regression.txt','Long filename fixture');
for(let i=1;i<=35;i++)write('attachments/count/count-'+String(i).padStart(2,'0')+'.txt','FAST_COUNT_'+i+'\n');
function packageSkill(dir,key,icon,body='When explicitly invoked, reply exactly FAST_RICH_BASE_OK. Do not access external systems.'){
  const fields={name:'fast-assert-'+key+'-RUN',description:'Harmless package regression fixture',version:'1.0.0',...(icon?{icon}: {})};
  write('packages/'+dir+'/SKILL.md','---\n'+Object.entries(fields).map(([k,v])=>k+': '+JSON.stringify(v)).join('\n')+'\n---\n\n'+body+'\n');
}
packageSkill('rich','rich','assets/icon.png');write('packages/rich/assets/icon.png',png);write('packages/rich/references/handbook/advanced/checklist.md','FAST_DEEP_CHECKLIST\n');write('packages/rich/data/notes.txt','FAST_NOTES\n');write('packages/rich/data/records.json','{"marker":"FAST_JSON"}\n');write('packages/rich/data/sample.bin',Buffer.from([0,1,2,255]));
packageSkill('missing-icon','missing-icon','assets/missing.png');packageSkill('bad-png','bad-png','assets/icon.png');write('packages/bad-png/assets/icon.png','This is not a PNG.');
packageSkill('network-icon','network-icon','http://127.0.0.1:9/fast-assert-icon-RUN.png');
packageSkill('root','root');packageSkill('root/nested','nested');packageSkill('collection/one','collection-one');packageSkill('collection/deep/two','collection-deep');
packageSkill('trash','trash');write('packages/trash/.DS_Store','safe junk');write('packages/trash/__MACOSX/._SKILL.md','safe junk');
packageSkill('mixed/valid','mixed-valid');packageSkill('mixed/duplicate','root');packageSkill('mixed/invalid','mixed-invalid');const invalid=path.join(froot,'packages/mixed/invalid/SKILL.md');fs.writeFileSync(invalid,fs.readFileSync(invalid,'utf8').replace(/^description:.*\n/m,''));
const base=JSON.parse(fs.readFileSync(path.join(root,'夹具/expert-template/metadata.json'),'utf8'));
function expert(key,changes={},long=false){const m={...base,name:'fast-assert-expert-'+key+'-RUN',profession:{zh:'本轮扩展专家-'+key,en:'Fast Extended '+key},displayDescription:{zh:'FAST_EXPERT_DESCRIPTION_INITIAL',en:'FAST_EXPERT_DESCRIPTION_EN'},...changes};
 write('experts/'+key+'/metadata.json',JSON.stringify(m,null,2)+'\n');write('experts/'+key+'/agent.md','---\nname: '+m.name+'\ndescription: Harmless expert fixture\n---\n\nWhen explicitly asked to execute your fixed rule, return exactly FAST_EXPERT_EXT_OK. Do not access external systems.\n'+(long?Array.from({length:100},(_,i)=>'Harmless reading line '+(i+1)+'.').join('\n')+'\nFAST_PROMPT_END\n':''));}
expert('minimal',{profession:undefined,displayDescription:undefined,version:undefined,author:undefined,category:undefined,defaultInitPrompt:undefined,quickPrompts:undefined,tags:undefined,avatar:undefined,skills:undefined});
expert('en-description',{displayDescription:{en:'FAST_EXPERT_DESCRIPTION_EN'}});expert('base-description',{displayDescription:undefined,description:'FAST_EXPERT_DESCRIPTION_BASE'});expert('longread',{},true);
expert('overwrite',{name:'fast-assert-expert-longread-RUN',displayDescription:{zh:'FAST_OVERWRITE',en:'FAST_OVERWRITE'}},true);
expert('bundled',{skills:['./skills/bundled']});write('experts/bundled/skills/bundled/SKILL.md','---\nname: fast-assert-bundled-RUN\ndescription: Harmless bundled fixed response\n---\nWhen explicitly invoked, return exactly FAST_BUNDLED_OK. Do not use tools or external systems.\n');
write('experts/bundled/agent.md','---\nname: fast-assert-expert-bundled-RUN\ndescription: Harmless bundled skill expert\n---\nWhen asked to execute the bundled skill, load skills/bundled/SKILL.md and follow its fixed reply rule. Do not copy the reply without loading the skill.\n');
const file=path.join(root,'用例/cases.json');const existing=JSON.parse(fs.readFileSync(file,'utf8'));const baseCases=existing.filter(c=>!Object.hasOwn(titles,c.group));
fs.writeFileSync(path.join(root,'用例/扩展-cases.json'),JSON.stringify(extra,null,2)+'\n');const reviewed=require('./review-contracts.cjs').review([...baseCases,...extra],root);fs.writeFileSync(file,JSON.stringify(reviewed.cases,null,2)+'\n');
const manifest=[];function inventory(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())inventory(p);else manifest.push({path:path.relative(root,p).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')});}}inventory(froot);
fs.writeFileSync(path.join(root,'用例/扩展夹具索引.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({base:baseCases.length,added:reviewed.cases.length-baseCases.length,total:reviewed.cases.length,assertions:reviewed.cases.reduce((n,c)=>n+c.assertions.length,0),optional:reviewed.optional.length,fixture_files:manifest.length},null,2));
