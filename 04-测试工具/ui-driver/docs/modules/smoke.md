# 冒烟辅助

[返回目标索引](../功能索引.md)

选择当前操作意图，只读一个场景。此页不展开函数参数或实现。

| 要做什么 | 意图 | 下一份资料 |
|---|---|---|
| 冒烟页面导航 | 辅助 | [候选与指导](../scenarios/smoke.navigation.md) |
| 冒烟对话执行 | 辅助 | [候选与指导](../scenarios/smoke.conversation.md) |
| 冒烟技能流程 | 辅助 | [候选与指导](../scenarios/smoke.skills.md) |

命令行：`node 04-测试工具/ui-driver/call.mjs --browse smoke`。

场景不匹配时返回目标索引，或 `--find "业务词" --module smoke --limit 3`。找不到再按 [扩展与边界](../扩展与边界.md) 核对缺口。
