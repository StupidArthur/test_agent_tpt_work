# 读取或关闭页面弹窗

[返回对话、任务、会话与权限](../modules/conversation.md)

先看真实弹窗再有限关闭；不以关闭弹窗代替业务确认。

| 候选函数 | 用途 |
|---|---|
| `conversation.readDialogs` | 读取主页面及iframe中的弹窗 |
| `conversation.closeDialogs` | 有限关闭页面内弹窗并确认 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.dialogs`；场景内检索：`--find "关键词" --route conversation.dialogs --limit 3`。
