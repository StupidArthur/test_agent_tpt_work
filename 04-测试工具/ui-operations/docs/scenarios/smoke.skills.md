# 冒烟技能流程

[返回冒烟辅助](../modules/smoke.md)

仅 PC-88 冒烟流程复用；明确业务目标优先对应业务模块，不将冒烟辅助当业务断言。

| 候选函数 | 用途 |
|---|---|
| `smoke.skills.skillsFrame` | PC-88 skills.skillsFrame（共用接入与记录） |
| `smoke.skills.ensureMenu` | PC-88 skills.ensureMenu（共用接入与记录） |
| `smoke.skills.openSkills` | PC-88 skills.openSkills（共用接入与记录） |
| `smoke.skills.closeSkills` | PC-88 skills.closeSkills（共用接入与记录） |
| `smoke.skills.importSkill` | PC-88 skills.importSkill（共用接入与记录） |
| `smoke.skills.search` | PC-88 skills.search（共用接入与记录） |
| `smoke.skills.listCards` | PC-88 skills.listCards（共用接入与记录） |
| `smoke.skills.readSwitch` | PC-88 skills.readSwitch（共用接入与记录） |
| `smoke.skills.setSwitch` | PC-88 skills.setSwitch（共用接入与记录） |
| `smoke.skills.openAndReadDetail` | PC-88 skills.openAndReadDetail（共用接入与记录） |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse smoke.skills`；场景内检索：`--find "关键词" --route smoke.skills --limit 3`。
