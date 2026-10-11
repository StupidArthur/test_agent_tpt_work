# 冒烟页面导航

[返回冒烟辅助](../modules/smoke.md)

仅 PC-88 冒烟流程复用；明确业务目标优先对应业务模块，不将冒烟辅助当业务断言。

| 候选函数 | 用途 |
|---|---|
| `smoke.navigation.skillsFrame` | PC-88 navigation.skillsFrame（共用接入与记录） |
| `smoke.navigation.expertsFrame` | PC-88 navigation.expertsFrame（共用接入与记录） |
| `smoke.navigation.closeDialogs` | PC-88 navigation.closeDialogs（共用接入与记录） |
| `smoke.navigation.ensureMoreMenu` | PC-88 navigation.ensureMoreMenu（共用接入与记录） |
| `smoke.navigation.goHome` | PC-88 navigation.goHome（共用接入与记录） |
| `smoke.navigation.openSkills` | PC-88 navigation.openSkills（共用接入与记录） |
| `smoke.navigation.openExperts` | PC-88 navigation.openExperts（共用接入与记录） |
| `smoke.navigation.closeSidebarPanels` | PC-88 navigation.closeSidebarPanels（共用接入与记录） |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse smoke.navigation`；场景内检索：`--find "关键词" --route smoke.navigation --limit 3`。
