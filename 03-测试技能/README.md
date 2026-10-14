# 测试技能入口

[返回产品功能导航](../00-产品特性与操作导航/README.md)

先读根 [AGENTS](../AGENTS.md) 与本轮任务 README，再按下面的实际需要选择技能或参考；**不要求每条用例通读所有文档**。

| 需要做什么 | 入口 |
|---|---|
| 静默安装或覆盖升级已下载的软件包 | [silent-install-skill](silent-install-skill/SKILL.md)：安装前准备、静默安装及安装结果核验；产品参数按需阅读 |
| 从 FTP/FTPS 获取带时间标签的最新构建包 | [get-latest-package-skill](get-latest-package-skill/SKILL.md)：筛选候选、按时间选包及下载；不执行安装 |
| 覆盖升级/已在用之后，需要把 TPT Work 恢复到初始（首次安装）环境（登录页、无项目、无会话） | [reset-environment-to-initial-skill](reset-environment-to-initial-skill/SKILL.md)：移走真正的用户数据与登录态后重开并核验起点；只清 `tasks`/`projects` 无效 |
| 通过 HTTP 管理局域网 OpenCode（会话、派工、状态与事件） | [lan-opencode-manage-skill](lan-opencode-manage-skill/SKILL.md)；机器地址清单按技能说明保存在本地，不提交凭据 |
| 通过 WebSocket / JSON-RPC 管理局域网 Codex（默认本机模型、全量 RPC 透传） | [codex-lan-manage-skill](codex-lan-manage-skill/SKILL.md)；独立机器清单与安全连接，继承主控 Git 验收规则 |
| 设计、执行、续跑探索性测试 | [exploratory-testing](exploratory-testing/SKILL.md)：通用流程、断言、恢复和交付 |
| TPT Work 尚未启动、CDP 不可用或不清楚如何接入 | [tpt-work-access](tpt-work-access/SKILL.md) → [启动与接入](tpt-work-access/references/启动与接入.md)；具体 EXE 命令、登录与界面操作见 [UI 与 API 操作指南](tpt-work-access/references/UI与API操作.md) |
| TPT Work 已接入，准备操作界面 | [软件 UI 操作工具](../04-测试工具/ui-operations/README.md)：按用例查函数、参数、调用和实际读取 |
| TPT Work 打开系统文件/文件夹选择器，或页面动作疑似被原生弹窗阻塞 | [原生 Windows 弹窗](tpt-work-access/references/原生Windows弹窗.md)：UIA 识别、Win32 操作、业务回读与适用范围 |
| 测试 TPT Work API / wire 网关 | [tpt-work-access](tpt-work-access/SKILL.md) → [UI 与 API 操作指南](tpt-work-access/references/UI与API操作.md)的独立网关章节 |
| 测试中出现定位失败、读值矛盾、前置失败 | [补测规则](exploratory-testing/references/retest.md) |
| 需要记录结构、证据归属和断言结果 | [记录契约](exploratory-testing/references/records.md) |
| 编写、扩展、调试或评审测试代码 | [test-automation-development](test-automation-development/SKILL.md)：[通用代码分层](test-automation-development/references/代码分层设计.md)、[函数开发规范](test-automation-development/references/函数开发规范.md)、[代码验证与入库](test-automation-development/references/代码验证与入库.md)（按需） |
| 扩展 TPT Work 已有 UI 工具库 | 先读 [测试代码开发技能](test-automation-development/SKILL.md)，再查产品专属 [扩展约定](../04-测试工具/ui-operations/docs/扩展与边界.md) |
| 查旧批次的操作方法或证据 | [历史批次入口](../05-探索性测试/历史归档/早期测试批次/README.md) |
| 用户要求发送钉钉通知 | [dingtalk-notify](dingtalk-notify/SKILL.md)，使用其中 Python Markdown 发送函数 |

**职责边界：**`exploratory-testing` 负责测试执行与判定，`test-automation-development` 负责测试代码开发与验证，`tpt-work-access` 只处理 TPT Work 的启动、连接和 UI/API 接入；`silent-install-skill`/`get-latest-package-skill` 负责安装与取包，`reset-environment-to-initial-skill` 负责把 TPT Work 状态恢复到初始（首次安装）环境；`dingtalk-notify` 负责通知。操作函数的真实契约以 [工具库](../04-测试工具/ui-operations/README.md) 为准。探索产生的观察和候选缺陷留在本轮任务 [待审核区](../05-探索性测试/README.md)，未经审核不直接写入正式资料。
