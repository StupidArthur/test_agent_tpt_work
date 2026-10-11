# 选择与提交技能文件或 ZIP

[返回技能](../modules/skills.md)

单文件与 ZIP 候选确认是不同流程；需要监听图标请求时转 icon。

| 候选函数 | 用途 |
|---|---|
| `skills.readImportDialog` | 打开技能导入弹窗并读取文件 input 数量 |
| `skills.importSingleFile` | 选择单个 SKILL.md 提交导入；返回文件input数量、卡片是否存在、弹窗是否关闭 |
| `skills.importPackage` | 导入单个技能包（SKILL.md 或 .zip）并读取校验反馈与卡片存在 |
| `skills.readImportCandidates` | 选择 ZIP 读候选与列表（不确认），随后取消 |
| `skills.confirmImport` | 提交并确认 ZIP 导入并读取结果 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse skills.import`；场景内检索：`--find "关键词" --route skills.import --limit 3`。
