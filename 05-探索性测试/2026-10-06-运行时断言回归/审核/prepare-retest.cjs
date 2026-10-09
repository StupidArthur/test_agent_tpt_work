const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'../../..'),old=path.resolve(__dirname,'..'),base=path.join(repo,'探索性测试/2026-10-06-业务函数复用回归'),dest=path.join(repo,'探索性测试/2026-10-06-审核缺口补测');
if(fs.existsSync(dest)&&!(process.argv.includes('--resume-preparation')&&!fs.existsSync(path.join(dest,'任务状态.json'))&&fs.readdirSync(path.join(dest,'结果')).length===0))throw Error('任务已经存在，不能重建覆盖');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const audit=JSON.parse(fs.readFileSync(path.join(__dirname,'逐条验收.json'),'utf8'));
const defs=JSON.parse(fs.readFileSync(path.join(base,'用例/cases.json'),'utf8'));
const selected=audit.entries.filter(e=>['R','C','X'].includes(e.code)&&!['G12-04','G12-05'].includes(e.case_id)||['G6-06','G7-11','G14-04'].includes(e.case_id));
const instructions={
'G1-03':'点击当前任务的选择项目；从已有项目列表选择一项，不添加项目；读取当前任务项目控件，和所选项目名比较',
'G1-06':'新建本轮普通文本会话并等待完成；限定该会话的产物列表/产物面板，确认读取区域真实存在；读取产物数，不能用猜测的全页class计数',
'G1-08':'在本轮代码块回复会话中打开或定位产物区域；读取该会话产物数；助手代码块不作为文件产物，不能读其他会话',
'G2-02':'准备未安装过的新内部name的SKILL.md；提交前查该身份不存在；实际导入并读取明确反馈与新注册身份，不能复用同名跳过',
'G2-03':'使用G2-02导入的内部name定位唯一卡片；进入详情核对内部name；读取这张卡片展示标题并和夹具比较，不能选第一张同标题旧卡',
'G3-01':'为默认状态检查另导入一份新的合法技能；提交前查身份不存在；导入后不点任何开关，立即读取该技能checked，记录这是首次读取',
'G3-03':'保存当前活动会话身份；在本轮技能详情点击使用；观察进入后的技能chip及会话/草稿身份；需要发送才产生session时，仅发送无害执行请求并绑定新session，不能手动newTask或补打斜杠代替入口效果',
'G3-04':'使用本轮技能执行无害请求；定位该轮加载资源/执行记录，读取准确技能内部name；回复内容单独读取，不能用全页技能名作为加载证据',
'G5-02':'选择本轮专家后执行无害请求；定位该轮专家加载/上下文资源记录；读取准确专家身份，不在全页搜专家名',
'G5-07':'准备缺agent.md的新专家目录，记录提交前正式目录/注册状态；提交导入；读取对应缺文件错误反馈，并检查没有新正式对象；弹窗仍在不算拒绝证据',
'G5-08':'准备无效metadata.json的新专家目录，记录原对象哈希；提交导入；读取对应格式错误原文并回读哈希；没有明确反馈不能只凭哈希不变判拒绝',
'G6-06':'读取常规设置默认权限并记录初值；设为工作区内修改，重开确认保存；从新建入口创建独立无害会话并确认新session，读取该会话权限按钮；恢复设置初值并重开回读，草稿及项目权限另记',
'G7-09':'准备30份本轮附件的草稿；定位附件容器，读取横纵scroll/client尺寸及overflow；沿确实可滚动的轴滚至末端，读取count-30.txt可见性',
'G7-11':'在有3份附件的草稿中读取附件工具区全部可见控件，确认是否有批量清空；有则实际点击并重新读数量；没有则入口断言为false、清空后的数量为null并注明未执行，不抄点击前数量',
'G7-12':'发送本轮附件请求并绑定该条用户消息；只在这条已发送消息附件区读取名称及移除控件，比较与草稿可移除状态；不能读整页或整个会话容器',
'G8-02':'创建本轮无害会话A及对照B；在不删除消息的条件下为A建立明确未读标记，读进入前标记；进入同一A后读标记变化及目标会话身份',
'G8-03':'对本轮会话执行标为未读；读取该行未读标记原文、属性与数量；未读：空闲表示存在未读，idle不能直接算0；回到原已读状态并回读',
'G8-06':'在已有项目发起对本轮无害文件的读取；确认工具调用成功且属于本轮session；在该工具步骤里分别读取参数和输出，不搜索用户请求中的路径',
'G8-07':'对本轮含长行的文件执行读取并确认输出已产生；定位这一次工具输出容器，读取宽高和overflow；滚动并读取末端内容，找不到容器记null而非不支持滚动',
'G8-08':'选定可写已有项目并确认本轮任务权限；请求生成本轮无害文件，读取执行终态和回复；同时独立查目标文件以及该session产物列表，用户请求中路径不算产物卡',
'G8-09':'在独立本轮任务产生两次成功读取，确认两条工具记录属于该任务；定位对应组合工具组；实际展开并读取子步骤身份，不用全页aria-expanded计数',
'G8-10':'另建独立本轮任务，只成功读取一次文件；在这一次工具记录里检查父子节点，判断是否产生多余嵌套；不能复用写盘任务或只统计group数量',
'G9-07':'创建未安装过的缺name样本，唯一目录名且保留name缺失；提交前查目录/默认身份无冲突；导入，读取明确缺name反馈及是否注册，不把uploaded-skill同名跳过当校验',
'G9-08':'创建新合法name但缺description的样本；确认身份尚未安装；导入并读错误原文及正式对象状态；如果实际导入，照实记差异',
'G9-12':'导入本轮合法PNG图标样本；在该技能卡/详情图标节点读取src/currentSrc及加载尺寸，比较实际资源与样本；安装目录有PNG不算显示成功',
'G9-13':'导入本轮缺图标样本；定位该技能图标节点；读取默认资源URI与加载状态，不能用详情里任意SVG存在作为回退证据',
'G9-14':'导入本轮伪PNG样本；定位该技能图标节点；读取资源URI和加载状态，区分默认SVG与样本PNG；按修订断言判断回退，任意图片加载成功不等于坏PNG被渲染',
'G10-03':'进入本轮深层资源技能详情，定位文件树而非预览正文；展开目录读取子项，再折叠；仅在文件树内检查checklist.md是否隐藏，预览标题不参与比较',
'G10-05':'在本轮技能文件树点击图片样本；定位当前图片预览区img；读取样本URI和尺寸，不计卡片图标及按钮图标',
'G10-07':'保存本轮技能源文件哈希；有效修改规则后发起新请求；读取该任务实际加载资源身份/内容版本及助手输出；分别验证加载与行为，最后恢复源文件并核验哈希',
'G10-09':'有效外部修改本轮技能并确认修改状态实际已被读取；在恢复之前读取该技能来源标签和目标身份；随后恢复文件并核验，不能只在恢复后的干净状态检查标签',
'G11-04':'打开本轮长提示词专家详情；定位提示词正文及其滚动容器；读取首尾唯一标记，滚到底后比较末尾标记和容器边界；不要只找没有子节点的元素',
'G11-07':'调用本轮含内置技能专家；读取本轮任务的内置技能加载/调用身份及固定回复；回复成功不代替加载证明',
'G11-08':'进入本轮专家详情，读取实际可见编辑按钮；点击去对话编辑或当前对应入口；确认进入该专家编辑会话，读取编辑模式/绑定专家和编辑器内容，点击异常不可吞',
'G11-09':'确认G11-08编辑会话已建立；提交本轮无害修改请求；等待有效修改提案，读取确认入口/提案内容和提交前文件哈希；没有提案时下游null并说明原因',
'G11-10':'使用已成功生成的本轮提案，保存agent.md和metadata.json；实际点击确认；读取确认反馈、两份文件及哈希；按用例验证写盘，再恢复两份原文件并独立核验',
'G12-02':'记录用量初值；切为简洁并确认保存；在本轮无害回复的真正性能页脚读取显示字段及隐藏字段，不扫描全页style；恢复初值回读',
'G12-03':'切用量为详细并确认保存；定位本轮会话的性能页脚读取轮数/步数/token字段；恢复初值重开回读，设置值和实际页脚分别取证',
'G12-08':'打开常规设置编辑快捷键；用关闭快捷键或修改新会话快捷键定位独立快捷键dialog；保存当前新会话组合，改Ctrl+Alt+Shift+F9，关闭重开回读；恢复原组合并回读，不写死CtrlN',
'G12-09':'在独立快捷键dialog读取当前搜索会话组合并保存；关闭弹层，实际按该组合；确认搜索输入面板可见，不能读不到组合仍固定按CtrlK',
'G12-10':'记录代码工具及权限初值；开启代码工具并确认保存；在已有项目创建本轮文件，明确选择可写权限；提交修改请求，读执行终态/错误和文件实际内容及轨迹，恢复设置初值',
'G12-11':'关闭代码工具并确认保存；用独立本轮文件重复同类请求，读真实终态、文件内容和该任务工具记录；和开启场景分别绑定session比较，恢复设置并回读',
'G12-12':'启动本轮唯一URL的本地链接夹具，记录请求日志起点和链接设置初值；设应用内侧边栏；产生准确Markdown链接，核对href与预定URL完全一致后点击；读新增请求及实际侧栏，恢复初值',
'G12-13':'设默认浏览器并确认保存；使用另一条本轮唯一URL，核对href后点击；只读本次点击后新增请求的user_agent及可观察外部进程/页面，确认打开归属；恢复实际初值并回读',
'G12-17':'执行设置场景前保存本轮会触及的各分类字段及快捷键初值；各项操作后恢复；全部设置测试结束再逐项重开回读并比较，列残留；不能在g12b/c之前收尾',
'G13-01':'在新任务composer输入@；观察这次出现的浮层并绑定composer，用浮层内容而非第一个全页menu读取本地/资料入口；记录完整菜单后退出并恢复草稿',
'G13-04':'在专家iframe点击实际新建入口；观察导航后实际目标frame/任务模式及创建专家资源身份，确认进入创建流程；独立读取导入dialog目录input，分别判两项，最后退出未提交流程',
'G13-05':'在自动化页绑定一张具体推荐案例；点击前读取该卡实际完整提示词并保存为expected；点击使用，独立读取目标composer；不得把点击后actual写成expected或读style当提示词',
'G13-06':'记录点击前页面/弹层及外部进程基线；确认帮助与反馈菜单实际点击成功；在case等待窗口读取顶层、新page、frame、dialog及可观察外部响应；观察通道缺失写未验证，不能据两个计数不变判全无响应',
'G13-10':'点击本轮技能卡片主体；在实际详情读取内部name，按YAML字段语义处理引号并和夹具name比较；保存原始字段及规范值，不做宽松子串匹配',
'G13-11':'在技能iframe点新建技能；导航后重新发现实际目标页面，读取创建模式/创建技能资源身份及左导航可见性；不扫描全页前3000字判断模式，最后退出未提交流程',
'G13-12':'进入设置内置插件，观察实际插件卡结构，保存初始展开状态；点击对应卡并读取其详情真实可见状态；恢复初始状态并回读，找不到aria-expanded不等于没有展开',
'G13-14':'打开排序菜单，读取当前选中项和实际选中标记；选另一项并重开读取；恢复最初读到的项并再次回读，不能写死最近更新',
'G14-01':'记录正式身份集合；选择本轮root.zip但不点确认；读已选文件名及正式身份集合；取消并再查无新注册对象；候选列表是否展示仅另记观察，不假定必须存在',
'G14-02':'确认本轮root身份提交前不存在；提交root.zip并读取导入结果及新增正式身份；检查嵌套技能是否被拆成全局对象，不能复用已有root来测试增量',
'G14-03':'确认集合包各身份不存在；提交collection.zip并最终确认；读实际正式导入对象内部name列表，和夹具预期一级候选比较；记录二级样本是否被导入，不假定确认前有候选列表',
'G14-04':'使用尚不存在的新垃圾文件样本，记录提交前安装目录不存在；实际导入，读确认反馈并递归列安装目录；检查.DS_Store与__MACOSX，不能把旧目录残留算本次复制',
'G14-05':'使用G14-02新安装root，保存SKILL.md哈希；再次提交同一root.zip并点默认确认，不强制覆盖；确认后读该身份处理结果是否跳过，回读原文件哈希',
'G14-06':'为合法、重复、缺字段三类样本准备对应前提：只有重复项预装，合法/缺字段项未存在；提交混合包；将每条反馈绑定具体内部name并检查正式注册对象，不能用全弹窗成功词赋值给每一项'
};
if(selected.length!==59||selected.some(e=>!instructions[e.case_id]))throw Error('59条补测说明未齐');
for(const d of ['用例','结果','运行日志','证据','审核','tools','code/business','code/automation','code/probes'])fs.mkdirSync(path.join(dest,d),{recursive:true});
const changes=[];
const cases=selected.map(e=>{const c=structuredClone(defs.find(c=>c.id===e.case_id));c.contract_version='retest-1.0';c.source_case_id=e.case_id;c.source_task='2026-10-06-运行时断言回归';c.original_status=e.original_status;c.retest_reason=e.reason_and_remedy;c.steps=instructions[e.case_id].split('；');c.assertions.forEach(a=>{a.read+='。本次必须按本条steps指定的对象、动作顺序和读取范围取值；保存组成原值及失败依赖。';});c.evidence_required=['本次真实动作/读取日志、actual、事件引用和代码版本；通过默认不截图'];c.preconditions=['按本机CDP及安装包实际身份接入；标准/low；只选已有项目','用本轮唯一后缀生成样本；按steps核验对象初态；旧name、路径和已安装对象不能默认复用'];c.depends_on=(c.depends_on||[]).filter(id=>selected.some(e=>e.case_id===id));if(c.id==='G12-17')c.run_last_in_settings=true;return c;});
function edit(id,aid,fields,why){const c=cases.find(c=>c.id===id),a=c.assertions.find(a=>a.id===aid);changes.push({case_id:id,assertion_id:aid,before:structuredClone(a),after:{...a,...fields},reason:why,merge:'保留旧判据与旧值；新判据不能冒充旧断言复测通过'});Object.assign(a,fields);}
edit('G14-01','G14-01-A1',{target:'确认前已选择本轮root.zip',read:'在实际导入dialog读取所选ZIP文件名，和本轮root.zip比较；保存完整dialog原文。',expected:true},'原判据假定确认前展示内部候选列表；新任务验证选择文件及确认前不入库，候选展示另外记差异');
edit('G14-03','G14-03-A1',{target:'最终确认后导入的集合内部名列表',read:'提交前记录相关身份不存在，最终确认后读取本包新增正式对象内部name，排序后与预先生成的collection_expected_names比较。'},'候选展示阶段不明确，改读最终导入对象以验证一级扫描范围');
edit('G14-05','G14-05-A1',{target:'最终确认后同名处理结果',read:'重复导入时不选择覆盖，最终确认后读取本轮root身份对应处理反馈；跳过记跳过，不用确认前是否存在默认选项判断。'},'跳过反馈在确认后出现，原读取阶段不适用');
edit('G12-02','G12-02-A2',{read:'限定本轮任务真正性能页脚，读取简洁档基本用量或速度字段，如tok/s或百分比；至少一个对应字段可见为true。保存具体字段原文；不扫描全页CSS或旧消息。A1另检查详细字段隐藏，tok/s不当作总token字段。'},'排除tok/s与tok子串冲突；A1验证详细字段隐藏，A2验证基本用量显示');
fs.writeFileSync(path.join(dest,'用例/cases.json'),JSON.stringify(cases,null,2)+'\n');
fs.writeFileSync(path.join(dest,'审核/判据变更.json'),JSON.stringify(changes,null,2)+'\n');
for(const rel of ['结果格式.md','扩展场景与夹具.md','函数调用与代码留存.md','tools/record.cjs','tools/compare.cjs','tools/prepare-fixtures.py','tools/link_fixture.py'])fs.copyFileSync(path.join(base,rel),path.join(dest,rel));
function copyDir(from,to){fs.mkdirSync(to,{recursive:true});for(const n of fs.readdirSync(from)){const src=path.join(from,n),dst=path.join(to,n);if(fs.statSync(src).isDirectory())copyDir(src,dst);else fs.copyFileSync(src,dst);}}
for(const d of ['夹具/扩展','夹具/skill-template','夹具/expert-template','夹具/expert-missing-agent','夹具/expert-bad-json'])copyDir(path.join(base,d),path.join(dest,d));
fs.writeFileSync(path.join(dest,'code/business/catalog.json'),'[]\n');
const sources=['用例/cases.json','审核/逐条验收.json','审核/实机复核补充.md'].map(rel=>({task:'2026-10-06-运行时断言回归',path:rel,sha256:sha(path.join(old,rel))}));
sources.push({task:'2026-10-06-业务函数复用回归',path:'用例/cases.json',sha256:sha(path.join(base,'用例/cases.json'))});
fs.writeFileSync(path.join(dest,'来源与合并映射.json'),JSON.stringify({sources,queue_sha256:sha(path.join(dest,'用例/cases.json')),selected:cases.map(c=>({case_id:c.id,source_case_id:c.source_case_id,reason:c.retest_reason,changed_assertions:changes.filter(x=>x.case_id===c.id).map(x=>x.assertion_id)})),retained:audit.entries.filter(e=>!selected.some(s=>s.case_id===e.case_id)).map(e=>({case_id:e.case_id,original_status:e.original_status,audit_verdict:['G12-04','G12-05'].includes(e.case_id)?'实机补充已取得保存失败证据':e.verdict,source:'原结果与审核证据保留，不要求重复执行'}))},null,2)+'\n');
fs.writeFileSync(path.join(dest,'任务状态.json'),JSON.stringify({phase:'交接就绪',execution_allowed:true,case_count:cases.length,assertion_count:cases.reduce((n,c)=>n+c.assertions.length,0),source_task:'2026-10-06-运行时断言回归',results_merged:false,merge_owner:'root与用户审核后逐条合并',scope:'仅59条缺口补测，不重跑已认可75条；另外6条已有直接证据候选保留'},null,2)+'\n');
const md=['# 补测清单','', '每条的完整比较规则在[用例/cases.json](用例/cases.json)。以下步骤是本次执行步骤，旧轮代码不是执行依据。',''];for(const c of cases){md.push(`## ${c.id} ${c.title}`,'',`原问题：${c.retest_reason}`,'',...c.steps.map((s,i)=>`${i+1}. ${s}。`),'',...c.assertions.map(a=>`- ${a.id}：${a.target}。读取：${a.read} 比较：${a.operator}；预期：${JSON.stringify(a.expected)}。`),'');}fs.writeFileSync(path.join(dest,'补测清单.md'),md.join('\n'));
console.log(JSON.stringify({task:dest,cases:cases.length,assertions:cases.reduce((n,c)=>n+c.assertions.length,0),retained:140-cases.length,changes:changes.length},null,2));
