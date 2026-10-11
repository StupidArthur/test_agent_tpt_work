# 新建、查找、进入会话

[返回对话、任务、会话与权限](../modules/conversation.md)

先按唯一身份查找，再进入指定会话；搜索计数不证明目标会话命中。

| 候选函数 | 用途 |
|---|---|
| `conversation.newTask` | 从新建任务入口建立任务，可选选择已有项目；读取编辑器可见可编辑、当前模型与推理等级、会话身份 |
| `conversation.openSession` | 进入指定会话（点击其侧栏行） |
| `conversation.listSessionRows` | 读取侧栏会话行列表 |
| `conversation.searchSessions` | 在真实搜索任务弹窗查询，读取该弹窗任务数和结果原文 |
| `conversation.openSearchShortcut` | 按下搜索会话快捷键并读取搜索面板可见状态 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.session`；场景内检索：`--find "关键词" --route conversation.session --limit 3`。
