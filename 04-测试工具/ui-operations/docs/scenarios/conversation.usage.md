# 读取输入区用量展示

[返回对话、任务、会话与权限](../modules/conversation.md)

仅用量文本与字段可见性，不推断计费或模型能力。

| 候选函数 | 用途 |
|---|---|
| `conversation.readUsageFooter` | 读取 composer 页脚用量展示文本及详细字段可见性 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.usage`；场景内检索：`--find "关键词" --route conversation.usage --limit 3`。
