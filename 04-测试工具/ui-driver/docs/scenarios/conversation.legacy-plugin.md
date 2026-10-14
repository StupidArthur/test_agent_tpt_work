# 读取左侧插件页卡片

[返回对话、任务、会话与权限](../modules/conversation.md)

旧左侧插件页面读法；设置中的内置插件用 settings.plugins。

| 候选函数 | 用途 |
|---|---|
| `conversation.readPluginCard` | 打开插件页读取卡片 aria-expanded；此为左侧插件页面的旧读法，不用于设置/内置插件，后者用 settings.listPluginCards/setPluginExpanded |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.legacy-plugin`；场景内检索：`--find "关键词" --route conversation.legacy-plugin --limit 3`。
