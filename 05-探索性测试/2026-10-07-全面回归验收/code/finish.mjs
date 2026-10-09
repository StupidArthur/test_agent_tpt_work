import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),repo=path.resolve(root,'../..'),read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),write=(n,v)=>fs.writeFileSync(path.join(root,n),JSON.stringify(v,null,2)+'\n');
const pack=read(path.join(root,'逐条审查包.json')),liveDir=path.join(root,'现场读取'),liveNames=fs.readdirSync(liveDir).filter(n=>n.endsWith('.json'));
const overrides={
 'G2-04':['符合','唯一英文样本搜索命中；历史样本污染了原总数断言。',['search-english']],
 'G2-05':['符合','唯一描述关键字命中。',['search-description']],
 'G3-01':['差异','新导入技能的 UI 开关为启用，与用例期望停用不符。',['default-enabled']],
 'G3-03':['差异','撤回原通过：原 wrapper 提前新建会话；直接入口前后 session 相同，引用正确。',['direct-use-actual']],
 'G5-08':['差异','坏 JSON 被拒绝，但反馈是缺文件的通用信息，不满足具体格式提示判据。',['G5-08-0','G5-08-1','G5-08-2']],
 'G7-02':['差异','30 个附件存在，未显示用例要求的数量提示。',['G7-02-1']],
 'G7-03':['差异','20+15 个附件达到35，第二批未按期望整批拒绝。',['G7-03-0','G7-03-3','G7-03-4']],
 'G7-11':['差异','3 个附件只有逐项删除，未发现批量清空入口。',['G7-11-1']],
 'G8-03':['符合','空文本的未读圆点也应计数：标记后1，打开后0。',['unread-fixed','unread-cleared']],
 'G9-07':['差异','缺 name 的包仍注册，注册身份退回目录名 missing-name。',['missing-name-before','missing-name-after']],
 'G9-08':['差异','缺 description 的包仍注册，未满足拒绝判据。',['missing-description-before','missing-description-after']],
 'G9-12':['差异','全新合法图标包仍显示默认 SVG，未使用包内图片。',['icon-fresh']],
 'G10-07':['符合','合法外部更新后可以继续调用；原模型拒答不构成刷新缺陷。',['rich-valid-use','rich-valid-reply','rich-valid-trace']],
 'G10-08':['差异','无效修改导致技能校验失败且未提示/保留旧有效内容；模型读取原文件补偿不能证明技能正常加载。',['rich-invalid-validation','rich-invalid-trace']],
 'G11-04':['符合','补取真实滚动位置和末尾标记可见范围，支持通过；原仅文本存在不足。',['longread-scroll']],
 'G11-10':['符合','当前任务具备正确写权限后，确认前文件不变，确认后字段实际写入，随后哈希恢复。',['expert-preconfirm-hashes','expert-written-field','expert-permission-full','expert-permission-restored']],
 'G11-12':['差异','坏 metadata JSON 后无明确错误反馈，卡片退回技术名称与版本；恢复后重开卡片正常。',['expert-invalid-feedback','expert-restored-card-reopen']],
 'G12-04':['差异','真实 checkbox 点击后仍为 true，显示保存失败，不只是旧函数定位失败。',['memory-click','memory-reopen']],
 'G12-05':['差异','真实 checkbox 点击后仍为 true，显示保存失败。',['evolution-click','evolution-reopen']],
 'G12-09':['待补证','设置 Ctrl+K，CDP 合成按键在有焦点时也未出现面板；未排除原生快捷键与合成事件的区别。',['shortcut-list','shortcut-focus']],
 'G12-12':['符合','使用 startLinkFixture 的实际 URL/log，服务正对照成立，点击后侧栏和独立请求均存在。',['links-before-sidebar','links-after-sidebar','links-panel-sidebar']],
 'G12-13':['符合','实际 URL 的默认浏览器请求存在，主界面没有侧栏；原硬编码端口/日志路径导致误判。',['links-before-default-browser','links-after-default-browser','links-panel-default-browser']],
 'G13-01':['符合','实际 @ 弹层是 listbox；修复 reader 后读到文件与文件夹组及候选。',['at-actual','at-fixed']],
 'G13-02':['符合','修改共享菜单读取后追加 + 菜单回归，保留其现场返回值。',['plus-menu-gate']],
 'G13-07':['符合','唯一中文样本命中1，原夹具重名污染不应判搜索失败。',['search-chinese']],
 'G13-08':['符合','唯一标签样本命中1。',['search-tag']],
 'G13-09':['符合','原记录 before/restored 均为 false，引用正确；原始返回已有 false→true→false，补证也支持切换与恢复。',['toggle-fresh']],
 'G13-13':['符合','实际搜索 dialog/input 定位后命中指定会话1条。',['search-fixed']],
 'G13-06':['待补证','只确认页面内没有响应，原函数未观察外部浏览器，不能据此定帮助入口坏。',['G13-06-0']],
 'G14-01':['差异','确认前只展示 ZIP 文件名，未发现用例要求的候选列表。',['zip-candidates']],
 'G14-02':['符合','新 root 样本注册集合仅增加根身份，nested 未增加，取消前后身份集合不变。',['root-before','root-after','zip-before','zip-after-cancel']],
 'G14-03':['差异','集合注册身份采用目录 one-audit-20261007，而非声明技术名。',['collection-before','collection-after']],
 'G14-04':['差异','垃圾文件 .DS_Store 与 __MACOSX/._SKILL.md 落入安装目录。',['trash-files']],
 'G14-06':['差异','第二份 mixed 样本保留已安装 duplicate，valid2/invalid2 均新增，坏包未按期望隔离。',['mixed2-before','mixed2-after','mixed2-import']]
};
const rows=pack.map(p=>{const id=p.case.id,o=overrides[id],status=o?.[0]||(p.result.status==='通过'?'符合':'待补证');const evidence=(o?.[2]||[]).map(n=>{const f=path.join(liveDir,n+'.json');if(!fs.existsSync(f))throw Error('Missing evidence '+n);const r=read(f);return {path:path.relative(repo,f).replaceAll('\\','/'),sha256:sha(f),call_id:r.call_id,status:r.status};});if(sha(path.join(repo,p.result_path))!==p.result_sha256)throw Error('Source changed '+id);return {case_id:id,original_status:p.result.status,audit_status:status,reason:o?.[1]||'已审查原操作、对象、断言与读取引用，接受原记录；本验收没有重跑此条全部动作。',method:evidence.length?'原记录审查+针对性现场取证':'原记录审查',original_result:{path:p.result_path,sha256:p.result_sha256},business_call_refs:p.result.business_call_refs,evidence};});
const counts={};for(const r of rows)counts[r.audit_status]=(counts[r.audit_status]||0)+1;
const initial=read(path.join(liveDir,'settings-initial.json')).observations.observations.fields,final=read(path.join(liveDir,'settings-final.json')).observations.observations.fields;
if(JSON.stringify(initial)!==JSON.stringify(final))throw Error('Settings not restored');
const cleanup=read(path.join(liveDir,'owned-fixtures-cleanup.json')).observations.observations.read.value;
write('验收台账.json',{scope:'140条原记录逐条审查，选定疑点现场补证；不是140条全量重新执行',counts,cases:rows});
const index=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else{const rel=path.relative(repo,p).replaceAll('\\','/');const owners=rows.filter(r=>r.evidence.some(x=>x.path===rel)).map(r=>r.case_id);index.push({path:rel,sha256:sha(p),case_ids:owners.length?owners:['ENV-AUDIT'],ownership:owners.length?'验收台账显式绑定':'共享环境、代码、调用快照或夹具；非独立业务通过证据'});}}}
for(const n of ['现场读取','运行日志','审核','夹具','恢复备份','code'])walk(path.join(root,n));
for(const r of rows)index.push({...r.original_result,case_ids:[r.case_id],ownership:'原始测试记录，未改写'});write('证据索引.json',index);
write('恢复检查.json',{settings_equal:true,settings_initial:initial,settings_final:final,owned_fixture_cleanup:cleanup.map(x=>({name:x.name,after:x.after??null,error:x.error?.split('\n')[0]})),limitations:['新增资产保留待审；部分目录身份与搜索身份不同或坏包开关 disabled，未证明全部停用。','链接测试新开的侧栏/外部浏览器页面尚未逐个关闭；缺按URL关闭且核验的库函数。']});
write('新增函数清单.json',{library:[{name:'conversation.readTaskPermissionOptions',path:'tools/tpt-work/business/conversation/permissions.mjs',evidence:['expert-permissions','task-permission-options']},{name:'conversation.setTaskPermission',path:'tools/tpt-work/business/conversation/permissions.mjs',evidence:['expert-permission-full','expert-permission-restored']}],task_catalog:'code/business/catalog.json',task_functions_retained:true});
const lines=['# 全面回归验收报告','', '## 验收结果','',`140 条原记录已逐条审查；${rows.filter(r=>r.evidence.length).length} 条关联针对性现场取证。验收归类：**${counts['符合']} 条符合、${counts['差异']} 条差异待审核、${counts['待补证']} 条待补证**。这不是重新跑完140条，也不是已确认17个产品缺陷。原结果与历史推断保持不变。`,'','原29条非通过中，11条现场补测符合、16条差异、2条仍待补证；原111条通过中，G3-03撤回通过，其余接受原证据或追加补证。G13-09已核对原始引用正确，补证支持切换与恢复；不把相同的初值和恢复值误判为未切换。','', '## 优先审核的问题','', '- **G3-03 假通过**：原 skills.useSkill 提前调用新建任务，随后会话不同不能证明“快捷使用”自己新建会话。直接入口前后 session 相同，引用成功。按当前用例归为差异；若产品定义是复用会话，应修改用例期望。','- **G12-04/05 真实保存错误**：修正 checkbox 点击后，记忆/沉淀仍为 true，反馈原文 `保存失败：Plugin entry "tpt-memory" has no volatile fields`，重开设置仍未改变。','- **G10-08 无效刷新**：坏内容造成技能校验失败；模型直接读取原文件得到输出不能当成正常加载证据。','- **ZIP 导入**：候选不展示、目录名成为集合身份、垃圾文件落盘、mixed 坏样本仍注册，均保留实测差异；是否属于需求变更待审核。','- **G12-09 / G13-06**：快捷键缺原生事件对照；帮助缺外部窗口观测。均保留待补证，不宣称产品故障。','', '## 操作函数验收','', '| 问题类别 | 具体情况 | 处理 |','|---|---|---|','| Agent 选错/组合错 | G3-03 用了带新建前置的 wrapper；G11-04已有真实滚动函数却只取文本；插件已有专用 settings 函数 | 记录正确函数/字段，不能包装前置替代被测动作 |','| Agent 参数与样本错误 | 链接忽略夹具返回的端口和日志路径；搜索断言被历史同名数据污染 | 动态绑定实际返回值，搜索用完整唯一关键字 |','| 库实现错误 | 空文本未读点、会话搜索 selector、@ listbox、checkbox 行、专家弹窗关闭、目录重复点击折叠、日志缺失转false | 已修正并留存现场调用和代码快照 |','| 真正缺函数 | 当前任务权限选择/确认缺统一函数 | 新增 readTaskPermissionOptions / setTaskPermission，实际验证完全权限与恢复 |','| 仍缺能力 | 按精确URL关闭链接测试页面并验证；原生快捷键/帮助外部窗口响应观测 | 保留缺口，不用主库调用率100%宣称能力完整 |','', '原轮481次调用用了125个不同函数；“新增函数清单为空”只能证明该轮没有新增，不能证明所有操作被正确覆盖。主库现有173个登记函数，目录覆盖与静态校验也不能代替现场行为验证。','', '## 下一轮只需补上的判据','', '1. 被测入口之前的准备不得提前完成该入口需要证明的行为；检查入口前后同一对象身份。','2. 切换验证记录 before、changed、reopened、restored；不能用自动恢复后的 after 证明切换成功。','3. 搜索/导入比较目标身份集合，使用唯一查询词；不能只比较总数量。','4. 链接直接使用夹具返回的 base URL 与 log path，先健康检查，再比较目标路径新增请求。日志缺失记取证失败。','5. 输出成功还要绑定正确的技能/专家资源与调用路径；绕过坏资源的模型补偿不能判该资源正常。','6. 反馈在关闭弹窗前读取。实际值写原值，不用省略字符串代替真实值。','', '## 恢复与限制','', '设置初末快照一致；修改过的原技能/专家文件按备份恢复，专家重开卡片正常；附件草稿清空、两个本轮链接服务停止、页面内弹窗为空。新增资产保留待审。','', `停用清理取得明确 after=false 的资产 ${cleanup.filter(x=>x.after===false).length} 个；另 ${cleanup.filter(x=>x.error).length} 个因注册名与页面搜索身份不一致或坏包开关 disabled 未完成停用核验，详见恢复检查.json。不能称环境无残留。链接打开的页面尚未逐个关闭。`,'', '所有候选仍在本任务目录待双方审核，未写入产品知识。','', '## 逐条结论','', '| Case | 原结果 | 验收 | 原因 |','|---|---|---|',...rows.map(r=>`| ${r.case_id} | ${r.original_status} | ${r.audit_status} | ${r.reason.replaceAll('|','/')} |`)];fs.writeFileSync(path.join(root,'验收报告.md'),lines.join('\n')+'\n');
fs.writeFileSync(path.join(root,'README.md'),'# 全面回归验收\n\n先读 [验收报告.md](验收报告.md)，逐条结论在 [验收台账.json](验收台账.json)，证据路径、SHA-256与归属在 [证据索引.json](证据索引.json)。恢复残留见 [恢复检查.json](恢复检查.json)。\n\n原任务为 ../2026-10-06-函数体系全面回归，本目录不覆盖原结果。code 下为本次实际验收脚本；夹具已导入，不能直接重复回放而假设环境全新。新增可复用函数和任务探针见 新增函数清单.json 与 code/business/catalog.json。\n');
console.log(JSON.stringify({counts,cases:rows.length,live_cases:rows.filter(r=>r.evidence.length).length,evidence_files:index.length,settings_equal:true,cleanup_remaining:cleanup.filter(x=>x.error).length}));
