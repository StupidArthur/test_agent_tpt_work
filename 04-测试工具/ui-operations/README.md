# 软件 UI 操作工具入口

按下面顺序渐进阅读。每次只查当前任务需要的部分，不要求通读全部函数和源码。

## 第一步：会接入、会调用

首次使用先按 [TPT Work 接入技能](../../03-测试技能/tpt-work-access/SKILL.md) 核验产品实例与通道，再读 [快速开始](docs/快速开始.md) 完成一次连接核验；已经接入的 Agent 可以跳过接入步骤。任务规则来自本轮 README、根 AGENTS 和 [探索性测试技能](../../03-测试技能/exploratory-testing/SKILL.md)。

## 第二步：找到当前操作的函数

有 case 编号，先查单条映射：

~~~powershell
node 04-测试工具/ui-operations/call.mjs --plan G10-07
~~~

没有编号，先检索少量候选；功能不明确时查 --modules。也可从 [功能索引](docs/功能索引.md) 进入模块：

~~~powershell
node 04-测试工具/ui-operations/call.mjs --find "技能 快捷使用" --module skills --limit 3
~~~

索引按功能分级列出用途和必填参数，不必读其他模块。搜索只是关键词候选，不能保证适用。映射是选用提示，不能替代本轮 case 的判据。存放和排序原则见 [工具发现与组织](docs/工具发现与组织.md)。

## 第三步：只查选中函数的契约

~~~powershell
node 04-测试工具/ui-operations/call.mjs --describe skills.useSkillRequest
~~~

核对参数来源、对象、是否含准备或恢复，以及真正要读取的结果。按 [调用与记录](docs/调用与记录.md) 执行、比较实际值、恢复并引用本轮证据。

status=returned 不表示 case 通过。优先调用现成函数；缺能力时先读 [测试代码开发技能](../../03-测试技能/test-automation-development/SKILL.md)，再按本库 [扩展与边界](docs/扩展与边界.md) 登记和实现；保留新增任务函数及实际调用，供收尾审核。

## 需要时再查

| 遇到的情况 | 阅读入口 |
|---|---|
| 找功能、选函数 | [功能索引](docs/功能索引.md) |
| 批量操作、返回结构、记录与恢复 | [调用与记录](docs/调用与记录.md) |
| 异常、读值矛盾、前置失败 | [补测规则](../../03-测试技能/exploratory-testing/references/retest.md) |
| 没有合适函数、需留存新函数 | [代码开发技能](../../03-测试技能/test-automation-development/SKILL.md) → [本库扩展与边界](docs/扩展与边界.md) |
| 查看用例候选映射 | [用例映射](coverage/README.md)，通常优先单条 --plan |
| 实际验证和已知缺口 | [全面回归验收](../../05-探索性测试/2026-10-07-全面回归验收/验收报告.md) |
| 当前覆盖与效率评估 | [当前评估](docs/当前评估.md) |
| 记忆面板、文件取证与添加/编辑 | [记忆与进化](docs/记忆与进化.md) |

目录：04-测试工具/ui-operations 是唯一实现位置。旧 04-测试工具/tpt-work 只保留历史脚本转发入口；新任务统一使用新目录。

代码职责：automation/ 管接入、定位、控件与记录；business/ 提供业务函数；coverage/ 建立用例映射；fixtures/ 提供夹具；sources/ 保存来源。LLM 根据 case 安排调用顺序和判定，不需要为每条 case 编写新脚本。
