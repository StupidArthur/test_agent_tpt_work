# 冒烟对话执行

[返回冒烟辅助](../modules/smoke.md)

仅 PC-88 冒烟流程复用；明确业务目标优先对应业务模块，不将冒烟辅助当业务断言。

| 候选函数 | 用途 |
|---|---|
| `smoke.conversation.readComposerState` | PC-88 conversation.readComposerState（共用接入与记录） |
| `smoke.conversation.selectProject` | PC-88 conversation.selectProject（共用接入与记录） |
| `smoke.conversation.setReasoning` | PC-88 conversation.setReasoning（共用接入与记录） |
| `smoke.conversation.typeDraft` | PC-88 conversation.typeDraft（共用接入与记录） |
| `smoke.conversation.send` | PC-88 conversation.send（共用接入与记录） |
| `smoke.conversation.waitForIdle` | PC-88 conversation.waitForIdle（共用接入与记录） |
| `smoke.conversation.readAssistantMessages` | PC-88 conversation.readAssistantMessages（共用接入与记录） |
| `smoke.conversation.isCompleted` | PC-88 conversation.isCompleted（共用接入与记录） |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse smoke.conversation`；场景内检索：`--find "关键词" --route smoke.conversation --limit 3`。
