# 查找技能、列表身份与数量

[返回技能](../modules/skills.md)

展示标题和内部名分别核对；查指定内部名用 searchSkill，广泛搜索用 searchSkills。

| 候选函数 | 用途 |
|---|---|
| `skills.searchSkills` | 在技能页填入搜索词并读取匹配卡片数量与标题 |
| `skills.searchSkill` | 技能页搜索并读取指定内部名命中数 |
| `skills.readSkillCard` | 读取指定展示名技能卡片的标题、来源、版本与开关状态 |
| `skills.readListIdentity` | 读取技能列表全部卡片标题（排序）作为内部身份集合 |
| `skills.readSkillCount` | 读取我的技能列表卡片数 |
| `skills.readSkillNames` | 读取注册表中的实际内部名，按本轮 query 筛选；不从期望标题推断身份 |
| `skills.readTabs` | 读取技能页双页签均可见可点击 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse skills.list`；场景内检索：`--find "关键词" --route skills.list --limit 3`。
