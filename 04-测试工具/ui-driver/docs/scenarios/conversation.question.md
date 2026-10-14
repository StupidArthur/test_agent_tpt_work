# 读取问题卡并选择或提交

[返回对话、任务、会话与权限](../modules/conversation.md)

先读取实际问题卡，按观察到的选项和提交按钮执行；精确按钮优先。readQuestionCard当前识别重新授权一次写入选项，不覆盖全部ask-user卡。 来源smoketest-1012，迁库版本仅静态复核；需要时查看单函数契约。

| 候选函数 | 用途 |
|---|---|
| `conversation.readQuestionCard` | 只读当前问题卡片(ask-user)结构，用于定位提交按钮。 |
| `conversation.clickButtonContaining` | 点击当前可见、文本包含指定片段的按钮（用于问题卡选项），并回读审批/对话状态。 |
| `conversation.clickExactButton` | 点击当前可见、文本精确匹配的按钮，并回读审批弹窗与对话状态。 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.question`；场景内检索：`--find "关键词" --route conversation.question --limit 3`。
