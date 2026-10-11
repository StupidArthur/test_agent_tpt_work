# 对话、任务、会话与权限

[返回目标索引](../功能索引.md)

选择当前操作意图，只读一个场景。此页不展开函数参数或实现。

| 要做什么 | 意图 | 下一份资料 |
|---|---|---|
| 新建、查找、进入会话 | 查找/创建 | [候选与指导](../scenarios/conversation.session.md) |
| 准备、读取与清空草稿 | 修改/观察 | [候选与指导](../scenarios/conversation.draft.md) |
| 发送消息、审批与读取终态 | 执行/观察 | [候选与指导](../scenarios/conversation.execution.md) |
| 检查工作步骤、工具轨迹与产物 | 观察 | [候选与指导](../scenarios/conversation.trace.md) |
| 读取或修改当前任务权限 | 修改/观察 | [候选与指导](../scenarios/conversation.permission.md) |
| 发现项目控件与已有选项 | 查找 | [候选与指导](../scenarios/conversation.project.md) |
| 侧栏排序、未读与提醒 | 修改/观察 | [候选与指导](../scenarios/conversation.sidebar.md) |
| 回复链接、侧面板与帮助入口 | 执行/观察 | [候选与指导](../scenarios/conversation.links.md) |
| 读取或关闭页面弹窗 | 观察/恢复 | [候选与指导](../scenarios/conversation.dialogs.md) |
| 读取左侧插件页卡片 | 观察 | [候选与指导](../scenarios/conversation.legacy-plugin.md) |
| 读取输入区用量展示 | 观察 | [候选与指导](../scenarios/conversation.usage.md) |

命令行：`node 04-测试工具/ui-operations/call.mjs --browse conversation`。

场景不匹配时返回目标索引，或 `--find "业务词" --module conversation --limit 3`。找不到再按 [扩展与边界](../扩展与边界.md) 核对缺口。
