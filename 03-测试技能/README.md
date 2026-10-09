# 测试技能入口

测试方法与产品接入是两种不同技能：通用测试流程由探索性测试技能负责，TPT Work 的启动、连接和操作入口由独立接入技能负责；具体 UI 函数位于 [软件 UI 操作工具](../04-测试工具/ui-operations/README.md)。

## 根据任务选技能

| 当前需要 | 阅读材料 |
|---|---|
| 执行、续跑或记录探索测试 | [exploratory-testing](exploratory-testing/SKILL.md) |
| 异常、矛盾和缺失取值的补测 | [retest](exploratory-testing/references/retest.md)，出现相关情况再读 |
| 接入与技术参考索引 | [接入参考](接入参考.md) |
| 定位、启动、连接或操作 TPT Work（UI/API） | [tpt-work-access](tpt-work-access/SKILL.md) → [启动与接入](tpt-work-access/references/启动与接入.md) → [UI 与 API 操作](tpt-work-access/references/UI与API操作.md)（按需） |
| 记录组织和共享证据 | [records](exploratory-testing/references/records.md) |
| 用户要求通过钉钉发送结果 | [dingtalk-notify](dingtalk-notify/SKILL.md)，使用其Python Markdown发送函数 |

先读根 AGENTS 与本轮任务 README，再读适用的通用测试技能；需要接入 TPT Work 时加载 tpt-work-access。参考文档按条件加载，不要求每条 case 重读全部技能。新增产品差异依然留在任务中待审核。
