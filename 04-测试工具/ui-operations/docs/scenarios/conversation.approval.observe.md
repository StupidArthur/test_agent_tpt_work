# 发送并等待审批或任务结束

[返回对话、任务、会话与权限](../modules/conversation.md)

sendAwait区分approval/idle/超时；waitIdle只读取当前会话，调用者绑定本轮请求并检查idle。 来源smoketest-1012，迁库版本仅静态复核；需要时查看单函数契约。

| 候选函数 | 用途 |
|---|---|
| `conversation.sendAwait` | 填入并发送消息，轮询等待权限审批弹窗出现或对话空闲。 |
| `conversation.readApprovalDialog` | 只读当前权限审批弹窗文本与按钮。 |
| `conversation.waitIdle` | 等待当前对话空闲并回读最终助手正文。 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.approval.observe`；场景内检索：`--find "关键词" --route conversation.approval.observe --limit 3`。
