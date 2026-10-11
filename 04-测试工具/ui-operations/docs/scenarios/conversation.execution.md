# 发送消息、审批与读取终态

[返回对话、任务、会话与权限](../modules/conversation.md)

发送后绑定 session 与唯一回复判断终态；审批须遵循本轮授权。

| 候选函数 | 用途 |
|---|---|
| `conversation.sendMessage` | 向 composer 填写文本并发送，等待终态后读取助手最终正文 |
| `conversation.decideApproval` | 处理对话内权限审批（允许一次/拒绝） |
| `conversation.readTaskState` | 读取当前会话终态：可见运行中指示数量、助手最终正文、助手气泡内代码块文本、产物卡数量 |
| `conversation.readCompletion` | 绑定session与唯一回复，读取已完成工作终态 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.execution`；场景内检索：`--find "关键词" --route conversation.execution --limit 3`。
