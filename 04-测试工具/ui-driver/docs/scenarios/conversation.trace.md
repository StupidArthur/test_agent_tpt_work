# 检查工作步骤、工具轨迹与产物

[返回对话、任务、会话与权限](../modules/conversation.md)

按业务断言选择轨迹、工具详情或真实产物；可见记录数量不能证明执行成功。

| 候选函数 | 用途 |
|---|---|
| `conversation.readToolTrace` | 读取本轮轨迹中的工具记录文本与输出容器可滚动性 |
| `conversation.readToolDetail` | 打开工具详情弹窗读取完整输出与容器可滚动性，结束时关闭弹窗 |
| `conversation.readArtifact` | 读取产物卡实际资源路径是否等于目标文件绝对路径，并读取磁盘文件内容 |
| `conversation.readWorkSteps` | 读取已完成工作步骤默认折叠状态；展开后读取可见工具记录与嵌套聚合层级 |
| `conversation.readVisibleToolCalls` | 读取当前会话中可见的工具调用记录数量 |
| `conversation.readTraceVisible` | 读取当前任务轨迹入口是否可见 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.trace`；场景内检索：`--find "关键词" --route conversation.trace --limit 3`。
