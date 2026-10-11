# 导入入口、提交与来源卡片

[返回专家](../modules/experts.md)

完整导入含可选冲突处理；单独观察冲突与异常包走 conflict。

| 候选函数 | 用途 |
|---|---|
| `experts.readImportDialog` | 打开专家导入弹窗并读取目录(webkitdirectory)与zip input 数量 |
| `experts.importDirectory` | 提交专家目录导入，可处理同名冲突(副本/覆盖)；返回冲突弹窗文本与卡片存在状态 |
| `experts.readCard` | 读取本轮专家卡片标题/版本/来源/运行位置与存在状态 |
| `experts.readImportDialogFolderInput` | 打开导入专家 dialog 读取 webkitdirectory 输入 |
| `experts.listAgentDirs` | 列出本机已安装专家目录名 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse experts.import`；场景内检索：`--find "关键词" --route experts.import --limit 3`。
