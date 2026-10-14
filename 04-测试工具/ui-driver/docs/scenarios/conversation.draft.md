# 准备、读取与清空草稿

[返回对话、任务、会话与权限](../modules/conversation.md)

准备当前输入和引用；发送与终态在执行场景，附件在附件模块。

| 候选函数 | 用途 |
|---|---|
| `conversation.readComposer` | 读取编辑器、草稿、引用、模型与项目 |
| `conversation.clearDraft` | 清空当前草稿并回读 |
| `conversation.readComposerMenu` | 在 composer 输入 @ 或 + 并读取弹出菜单项是否匹配 |
| `conversation.clickAutomationCase` | 打开自动化任务页读案例提示词，点击后读 composer 预填 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.draft`；场景内检索：`--find "关键词" --route conversation.draft --limit 3`。
