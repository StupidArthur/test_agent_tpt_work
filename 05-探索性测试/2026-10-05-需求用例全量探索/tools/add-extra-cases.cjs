// 仅补用例与登记既有入口证据，不操作产品、不宣称完成业务测试。
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),repo=path.resolve(root,'../..');
const core=JSON.parse(fs.readFileSync(path.join(root,'用例/cases.json'),'utf8'));
const definitions=[
['EXTRA-001','插件列表及本轮样本启停','SET','ENTRY-插件-A01','17:25',
 '打开更多→插件，盘点列表、配置项和实验项；仅对本轮新建且可恢复的无害插件样本测试启停，记录原状态；若无样本，保留入口观察并标启停检查点未验证；重开页面检查状态，执行无害标记任务核对实际生效，再恢复。',
 ['列表和配置入口逐项有观察','本轮样本启停后的状态与实际能力一致；仅列表开关变化不足以证明生效','实验项缺依赖或不可用有明确记录，不推断必然失效','原生添加弹窗不可控时不触发；已有用户插件不被改动']],
['EXTRA-002','会话搜索及结果跳转','D','ENTRY-搜索-A01','17:29',
 '用本轮会话标题中的唯一标记搜索；记录当前产品支持的匹配范围；分别查询命中、不命中、中文片段，清空查询；点击本轮命中结果并回读会话。',
 ['命中结果对应本轮会话，点击后打开正确会话','不命中有可理解反馈，清空后恢复可继续搜索','实际中文及匹配范围被记录；未明确承诺全文搜索或分词时不强判缺陷']],
['EXTRA-003','会话排序切换及恢复','D','ENTRY-排序方式-A01','17:29',
 '记录原排序与列表；用两条本轮会话制造可区分更新时间；切最近更新观察顺序；切手动排序检查已显示的操作，只有可控方式才尝试本轮会话顺序；重开列表观察持久性；恢复原偏好。',
 ['最近更新排序与可观察更新时间对应','手动排序的实际交互和结果有证据；不以合成拖拽失败判产品失败','记录重开后的持久性与原偏好恢复；未明确承诺的规则按实际行为留档']],
['EXTRA-004','本轮会话归档与取消归档','D','ENTRY-已归档会话-A01','17:29',
 '创建或选取明确本轮归属的无害会话，记录内容与所在列表；归档该会话；检查普通列表和已归档列表；从归档列表取消归档并回读内容；如有已验证提醒或置顶状态，补查交互，否则记未验证。',
 ['归档操作只影响本轮目标，列表可见性与实际归档状态一致','取消归档后能找到正确会话，原内容未丢失','未读或置顶交互单独记录验证范围；不能只打开归档列表就判闭环通过']],
['EXTRA-005','本轮任务权限档位与执行限制','SAFE','ENTRY-编辑器-permission-A01','17:33',
 '在本轮独立任务记录默认档位及每档说明；选择仅可查看，请求读取和修改本轮无害夹具，独立回读副作用；选择工作区内修改，仅在本轮目录检查写入；完全权限先检查说明，不对真实用户文件扩权；Auto review先核对说明和实验开关，再在获准隔离闸门测试允许拒绝及故障策略；无环境就记录未验证；恢复原档位。',
 ['档位选项、选中状态、说明及生效范围被记录','仅可查看下对本轮夹具的写入结果与说明相符，拒绝须由磁盘回读证明','工作区内修改对本轮范围限制有执行证据；不能仅凭按钮状态判断权限','Auto review与实验开关的关系需实际配置或契约证据，EXP标签不证明不可用','完全权限或Auto review缺获准环境时保留未验证，不对真实资产做危险操作']]
];
const manifest=JSON.parse(fs.readFileSync(path.join(root,'用例/来源清单.json'),'utf8'));
const cases=definitions.map(([id,title,key,folder,time,action,expected])=>{
 const prototype=core.find(c=>c.source.key===key),c=JSON.parse(JSON.stringify(prototype));
 Object.assign(c,{id,module:'EXTRA',title,priority:'P1',depth:'入口→本轮样本闭环；受限检查点保留未验证',basis:'开放探索（现有界面与合理预期；不是原设计新增承诺）',requirement_status:'Round 1发现的覆盖缺口；来源文档仅作背景',preconditions:['先读任务README；仅用低级模型、已有项目、本轮无害测试数据。','不得添加项目、删除记忆、触发不可控原生弹窗或改动现有用户资产。'],steps:['重新发现当前页面与控件；保存初态。',...action.split('；'),'等待明确终态，逐检查点记录实际行为、证据与差异。'],expected,constraints:['只处理本轮测试样本','无入口合理查找后记录未发现','缺依赖只记录未验证'],initial_status:'未执行'});delete c.task_scope;
 return c;
});
fs.writeFileSync(path.join(root,'用例/extra-cases.json'),JSON.stringify(cases,null,2)+'\n','utf8');
let md='# 补充探索用例 EXTRA-001～005\n\n原350条保留，新增5条，总计355条。新增条目未完成业务执行；已有入口证据仅作前置，不算通过。每条有多个检查点，可按子项分批验证。来源为现有UI观察与合理预期，相关设计仅作背景。\n\n';
const indexFile=path.join(root,'证据/索引.jsonl');const rows=fs.readFileSync(indexFile,'utf8').split(/\r?\n/).filter(x=>x.trim()).map(JSON.parse);const seen=new Set(rows.map(e=>e.path));
for(let n=0;n<cases.length;n++){
 const c=cases[n],[id,title,key,folder,time]=definitions[n],dir=path.join(root,'证据/ROUND1-ENTRY',folder);
 const evidence=fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>fs.statSync(path.join(dir,f)).isFile()).map(f=>'证据/ROUND1-ENTRY/'+folder+'/'+f):[];
 const attempt=id+'-ENTRY-A01';
 for(const p of evidence)if(!seen.has(p)){rows.push({path:p,case_id:id,attempt_id:attempt,captured_at:'2026-10-05T'+time+'+08:00',time_basis:'覆盖地图的分钟级观察时间，非文件mtime',type:p.endsWith('.png')?'截图':'入口观察文本',proves:'Round 1既有入口观察；不证明补充用例业务检查点通过',redacted:true,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')});seen.add(p);}
 const file=path.join(root,'执行记录',id+'.json');
 if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify({case_id:id,case_title:title,source_sha256:manifest.source_documents.find(s=>s.file===c.source.file).sha256,status:'未执行',review_status:'待双方审核',latest_attempt_id:attempt,attempts:[{attempt_id:attempt,started_at:'2026-10-05T'+time+'+08:00',ended_at:'2026-10-05T'+time+'+08:00',environment_id:'ENV-001',surface:'Round 1既有UI/CDP入口观察（此次仅整理证据，不重新操作）',actual_steps:['引用覆盖地图登记的'+folder+'入口观察；尚未执行补充业务步骤。'],observed_result:'仅取得既有入口观察；补充业务检查点仍未执行。',status:'未执行',evidence,notes:'观察时间沿用覆盖地图分钟级记录；新增编号仅为证据归属整理。'}],product_observations:[],differences:[],finding_ids:[],blocker:null,applicability_reason:null,cleanup:{changes:[],remaining:[]},review:{assistant:null,user:null,approved_scope:[],final_decision:'待审核'}},null,2)+'\n','utf8');
 md+=`## ${id} ${title}\n\n依据：Round 1「${folder}」及[背景原文](../../../01-产品资料/原设计文档/TPT桌面端设计资料/${c.source.file})。\n\n前置：${c.preconditions.join(' ')}\n\n${c.steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n检查点：\n\n${c.expected.map(s=>'- '+s).join('\n')}\n\n[逐条记录](../执行记录/${id}.json)。\n\n`;
}
fs.writeFileSync(indexFile,rows.map(e=>JSON.stringify(e)).join('\n')+'\n','utf8');
fs.writeFileSync(path.join(root,'用例/EXTRA-补充探索.md'),md,'utf8');
console.log(JSON.stringify({extra_cases:cases.length,indexed_evidence:rows.length,new_cases_executed:0}));
