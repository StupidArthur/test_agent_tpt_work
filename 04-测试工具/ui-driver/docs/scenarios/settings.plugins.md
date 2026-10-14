# 内置插件列表与展开收起

[返回设置与插件](../modules/settings.md)

设置内置插件，与左侧插件市场分开；展开修改后恢复初值。

| 候选函数 | 用途 |
|---|---|
| `settings.listPluginCards` | 读取内置插件卡片及初始折叠状态 |
| `settings.setPluginExpanded` | 指定插件展开/收起并回读详情 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse settings.plugins`；场景内检索：`--find "关键词" --route settings.plugins --limit 3`。
