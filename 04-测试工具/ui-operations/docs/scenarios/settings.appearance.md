# 主题、语言、字号与实际显示

[返回设置与插件](../modules/settings.md)

选中值与实际效果分别验证；回复外观绑定同一 session 和正文。

| 候选函数 | 用途 |
|---|---|
| `settings.readGeneral` | 读取常规初值：主题/语言/默认权限/字号，并读取场景预设选中值 |
| `settings.readSurfaceBg` | 读取主题影响表面的 computed background-color |
| `settings.setTheme` | 设置主题并读取改后选中值 |
| `settings.setLanguage` | 设置语言 |
| `settings.readGeneralNav` | 读取设置左侧导航语言显示（英文下为 General） |
| `settings.setFontDelta` | 按 delta 调整字号并读取改后数值 |
| `settings.readConversationAppearance` | 固定session及唯一回复正文，读取同一正文和容器计算颜色 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse settings.appearance`；场景内检索：`--find "关键词" --route settings.appearance --limit 3`。
