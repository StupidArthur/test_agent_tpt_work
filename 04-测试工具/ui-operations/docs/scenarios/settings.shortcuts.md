# 读取、录制与保存快捷键

[返回设置与插件](../modules/settings.md)

先 listShortcuts 查真实行名；保存绑定与原生快捷键生效需分别验证。

| 候选函数 | 用途 |
|---|---|
| `settings.readShortcut` | 读取某快捷键的规范化绑定文本 |
| `settings.setShortcut` | 录制并保存某快捷键的绑定 |
| `settings.listShortcuts` | 读取独立快捷键dialog的实际标签与组合，避免猜行名 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse settings.shortcuts`；场景内检索：`--find "关键词" --route settings.shortcuts --limit 3`。
