# 软件 UI 操作工具入口

按下面顺序渐进阅读。每次只查当前任务需要的部分，不要求通读全部函数和源码。

## 第一步：会接入、会调用

新环境先用 [环境检测工具集](../environment-check/README.md) 检测并读使用指南；同环境有效结果直接复用。Playwright以本项目模块解析和导入结果为准，`playwright-core`、`playwright`任一CDP接口可用即满足本库依赖，不凭单个包目录不存在决定安装。

目标明确时先按意图进入场景和单函数契约，不把“已连接”或“参数全部齐备”作为目标路由的门槛；缺字段在叶子指导中取得，函数内部已有核验不在外面重复。需要定位/启动/绑定真实实例时按 [接入技能](../../03-测试技能/tpt-work-access/SKILL.md) 分流；[快速开始](docs/快速开始.md) 的连接示例供首次试用连接读取或仅核对CDP的目标使用，不是所有任务的强制预检。任务规则来自本轮 README、根 AGENTS 和 [探索性测试技能](../../03-测试技能/exploratory-testing/SKILL.md)。

## 第二步：找到当前操作的函数

有 case 编号，先查单条映射：

~~~powershell
node 04-测试工具/ui-driver/call.mjs --plan G10-07
~~~

没有编号，从 [目标索引](docs/功能索引.md) 选择目标对象和操作场景；命令行使用同一份分类：

~~~powershell
node 04-测试工具/ui-driver/call.mjs --browse
node 04-测试工具/ui-driver/call.mjs --browse skills
node 04-测试工具/ui-driver/call.mjs --browse skills.use
~~~

对象页只给场景，场景页给少量候选及选用指导，参数留到单函数契约。已知函数名可直接 `--describe`；目标关键词明确可 `--find "快捷使用" --route skills.use --limit 3`。任务新增函数使用 `--find "关键词" --task <任务目录>`。搜索和映射只是选用提示，不能替代本轮 case 判据。分类维护见 [工具发现与组织](docs/工具发现与组织.md)。

## 第三步：只查选中函数的契约

~~~powershell
node 04-测试工具/ui-driver/call.mjs --describe skills.useSkillRequest
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
| 退出软件、重置前结束应用进程 | [退出应用进程](docs/scenarios/application.quit.md)：绑定身份、终止进程树、回读exited；关闭窗口/托盘/CDP断开不算退出 |
| 对话首次打开本地项目／创建项目 | [对话分类](docs/modules/conversation.md) → 首次打开／创建叶子；新组合待现场验收 |
| 系统文件/文件夹选择器或原生模态窗口 | [原生窗口分类](docs/modules/nativeWindow.md) → 发现/读取或显式操作；使用动态PID/句柄，业务结果另行回读 |
| 当前覆盖与效率评估 | [当前评估](docs/当前评估.md) |
| 记忆面板、文件取证与添加/编辑 | [记忆与进化](docs/记忆与进化.md) |

UI 操作实现统一位于 04-测试工具/ui-driver/。

代码职责：automation/ 管接入、定位、控件与记录；business/ 提供业务函数；coverage/ 建立用例映射；fixtures/ 提供夹具；maintenance/ 提供校验、文档生成和夹具准备。LLM 根据 case 安排调用顺序和判定，不需要为每条 case 编写新脚本。
