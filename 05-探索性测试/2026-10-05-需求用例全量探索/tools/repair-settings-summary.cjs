const fs=require('fs');
const file='探索性测试/2026-10-05-需求用例全量探索/设置项盘点与效果.md';
const text=fs.readFileSync(file,'utf8'), i=text.lastIndexOf('## A07');
if(i<0)throw new Error('A07 heading not found');
const restored=`## A07：记忆开关控件保存失败观察（2026-10-06）

本节原文本出现编码损坏，已依据原始JSON和截图重建；没有覆盖或修改原证据。归属 ENV-001 / Arthur / tpt-workspace / CDP 9234 + Playwright。本节只总结已有A07证据，不代表本次续跑的新UI操作。

初始回读中“启用记忆”和“启用沉淀”两个 checkbox 均为 checked=true, disabled=false。对“启用记忆”开关尝试关闭后，界面仍显示勾选，并出现红色提示“保存失败：Plugin entry \\\"tpt-memory\\\" has no volatile fields”。保存失败态截图 证据/OTHER-019/OTHER-019-A07/memory-0-off.png 清楚显示两开关仍开启；其JSON也记录两个输入仍为checked。之后再次回读，两个控件仍勾选。

对“启用沉淀”开关进行相同操作，截图 memory-1-off.png 与JSON状态同样记录两个控件仍勾选、出现相同保存失败提示；随后回读状态仍勾选。两组恢复态记录也均为checked=true。记忆概览仍显示0条记忆、0条索引；未编辑记忆文件，也未增加记忆条目。

| 观察项 | 初值 | 操作后的实际UI结果 | 最终值与数据 | 结论边界 |
|---|---|---|---|---|
| 启用记忆 | checked=true，disabled=false | 尝试关闭后控件仍勾选；页面显示“保存失败：Plugin entry \\\"tpt-memory\\\" has no volatile fields” | checked=true；记忆0条、索引0条 | 当前保存动作失败且开关没有改变；待双方审核错误提示含义与影响，不推断更广泛的记忆功能失效 |
| 启用沉淀 | checked=true，disabled=false | 尝试关闭后控件仍勾选；页面显示同一保存失败提示 | checked=true；记忆0条、索引0条 | 当前保存动作失败且开关没有改变；没有运行沉淀或编辑记忆资产 |

原始来源：证据/OTHER-019/OTHER-019-A07/memory-before.json、memory-0-off.json、memory-0-restored.json、memory-1-off.json、memory-1-restored.json及对应PNG。另一组setting inventory截图、UI文本和控件状态位于 证据/SETTINGS-ROUND/inventory/memory-toggle-states.json 与 memory-toggle-1.png / memory-toggle-2.png，其哈希及attempt归属以 证据/索引.jsonl 中 OTHER-019-A07 记录为准。专门的A07 PNG/JSON尚未单独索引；本段不把它们伪称为已入哈希索引的证据。

修订说明：原A07标题与表格正文损坏为问号字符；本次依据上述可读UTF-8 JSON及截图重建事实，并保留本说明。后续统一设置结论矩阵见设置逐项清单-夜间续跑.md。
`;
fs.writeFileSync(file,text.slice(0,i)+restored,'utf8');
console.log(JSON.stringify({replaced_from_offset:i,source_files:5,encoding:'UTF-8'}));
