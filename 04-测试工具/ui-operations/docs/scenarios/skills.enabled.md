# 启停开关、筛选及恢复

[返回技能](../modules/skills.md)

setSkillEnabled 由调用者恢复；toggleSwitchNoDetail 自带恢复，不跨调用比较同一阶段。

| 候选函数 | 用途 |
|---|---|
| `skills.setSkillEnabled` | 切换指定技能的启停开关并返回改前/改后 aria-checked |
| `skills.filterSkills` | 切换 全部/已启用/未启用 筛选并读取本轮样本匹配卡片数 |
| `skills.readSkillsListState` | 读取技能页搜索框值、本轮样本存在状态与最终开关 |
| `skills.toggleSwitchNoDetail` | 技能列表切换开关且不进入详情，回读改前/改后/恢复 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse skills.enabled`；场景内检索：`--find "关键词" --route skills.enabled --limit 3`。
