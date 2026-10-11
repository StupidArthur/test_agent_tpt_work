# 图标加载及导入网络请求

[返回技能](../modules/skills.md)

仅目标图标的加载状态或匹配请求数；常规导入走 import。

| 候选函数 | 用途 |
|---|---|
| `skills.readIconState` | 读取指定技能卡图标加载状态与资源身份、默认图标可见性 |
| `skills.importPackageMonitored` | 导入技能包并监听与该 icon URL 匹配的网络请求数 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse skills.icon`；场景内检索：`--find "关键词" --route skills.icon --limit 3`。
