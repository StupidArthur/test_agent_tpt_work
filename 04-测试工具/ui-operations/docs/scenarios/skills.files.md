# 安装文件、外部修改与校验反馈

[返回技能](../modules/skills.md)

外部文件变更不是 UI 编辑；必须保留初值并恢复。countDelta 是两次读取的派生比较。

| 候选函数 | 用途 |
|---|---|
| `skills.installedSkillFile` | 读写本轮实际安装的技能文件（外部修改，channel=file） |
| `skills.readValidationFeedback` | 打开技能列表读取本轮技能的外部修改校验反馈 |
| `skills.listInstalledFiles` | 递归列出本机技能安装目录文件（channel=file） |
| `skills.countDelta` | 基于两个读取事件计算计数增量（derived） |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse skills.files`；场景内检索：`--find "关键词" --route skills.files --limit 3`。
