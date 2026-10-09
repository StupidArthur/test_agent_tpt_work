# 测试技能入口

先读根 [AGENTS](../AGENTS.md) 与本轮任务 README，再按下面的实际需要选择技能或参考；**不要求每条用例通读所有文档**。

| 需要做什么 | 入口 |
|---|---|
| 设计、执行、续跑探索性测试 | [exploratory-testing](exploratory-testing/SKILL.md)：通用流程、断言、恢复和交付 |
| TPT Work 尚未启动、CDP 不可用或不清楚如何接入 | [tpt-work-access](tpt-work-access/SKILL.md) → [启动与接入](tpt-work-access/references/启动与接入.md)；具体 EXE 命令、登录与界面操作见 [UI 与 API 操作指南](tpt-work-access/references/UI与API操作.md) |
| TPT Work 已接入，准备操作界面 | [软件 UI 操作工具](../04-测试工具/ui-operations/README.md)：按用例查函数、参数、调用和实际读取 |
| 测试 TPT Work API / wire 网关 | [tpt-work-access](tpt-work-access/SKILL.md) → [UI 与 API 操作指南](tpt-work-access/references/UI与API操作.md)的独立网关章节 |
| 测试中出现定位失败、读值矛盾、前置失败 | [补测规则](exploratory-testing/references/retest.md) |
| 需要记录结构、证据归属和断言结果 | [记录契约](exploratory-testing/references/records.md) |
| 查不到合适的 UI 函数，需要扩展或维护 | [扩展规则](../04-测试工具/ui-operations/docs/扩展与边界.md)；必要时参考 [代码分层设计](../04-测试工具/ui-operations/docs/下一轮测试代码分层设计.md) |
| 查旧批次的操作方法或证据 | [历史批次入口](../05-探索性测试/历史归档/早期测试批次/README.md) |
| 用户要求发送钉钉通知 | [dingtalk-notify](dingtalk-notify/SKILL.md)，使用其中 Python Markdown 发送函数 |

**职责边界：**`exploratory-testing` 是通用测试方法；`tpt-work-access` 只处理 TPT Work 的启动、连接和 UI/API 接入；操作函数的真实契约以 [工具库](../04-测试工具/ui-operations/README.md) 为准。探索产生的观察和候选缺陷留在本轮任务 [待审核区](../05-探索性测试/README.md)，未经审核不直接写入正式资料。
