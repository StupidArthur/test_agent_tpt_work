# 同名冲突、异常包与安装完整性

[返回专家](../modules/experts.md)

submitImport 只停在冲突；chooseConflict 决定副本或覆盖，须先确认恢复范围。

| 候选函数 | 用途 |
|---|---|
| `experts.readFileExists` | 读取文件是否存在（channel=file） |
| `experts.readPaths` | 分别读取若干完整绝对路径（channel=file） |
| `experts.submitImport` | 提交专家目录导入并读取同名冲突弹窗（不选择处理方式） |
| `experts.chooseConflict` | 在专家同名冲突弹窗中选择 覆盖/副本 |
| `experts.readInstallPaths` | 读取指定内部名对应的完整安装路径 |
| `experts.readAgentDirFiles` | 读取安装目录内 agent.md 与 metadata.json 是否均存在 |
| `experts.submitAndReadFeedback` | 提交专家目录导入并读取列表数量(前/后)与拒绝反馈；kind 决定反馈判据 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse experts.conflict`；场景内检索：`--find "关键词" --route experts.conflict --limit 3`。
