# 默认权限、场景与输入区标签

[返回设置与插件](../modules/settings.md)

默认设置不等于当前任务权限；当前任务权限走 conversation.permission。

| 候选函数 | 用途 |
|---|---|
| `settings.setPermission` | 设置默认权限并读取改后值 |
| `settings.setScene` | 设置场景预设并读取改后值 |
| `settings.readComposerLabels` | 读取当前空白任务 composer 的权限标签、场景标签与助手正文字号 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse settings.defaults`；场景内检索：`--find "关键词" --route settings.defaults --limit 3`。
