---
name: tpt-work-access
description: 在测试中需要定位、启动、连接、操作 TPT Work 的真实 UI 或 API 网关时使用；覆盖 EXE、Electron CDP/Playwright、工具调用和接入排障。
---

# TPT Work 接入与操作

**本技能只负责产品专属接入和操作通道。** 测试设计、检查点执行、结果取证与审核由 [exploratory-testing](../exploratory-testing/SKILL.md) 和本轮任务 README 负责，不在此复制一套测试规则。

## 按目标分流，再补缺失条件

新环境先调用 [环境检测工具集](../../04-测试工具/environment-check/README.md) 并读使用指南，再补产品实例和对象核验；已有有效结果不重复手查工具版本。CDP接入支持 `playwright-core` 或 `playwright`，环境报告ok就复用，不能因没有 `node_modules/playwright` 而安装依赖。

- 目标是打开、复用、恢复显示或核对真实 TPT 实例，且已知准确exe：先进入 [复用或启动应用](../../04-测试工具/ui-operations/docs/scenarios/application.startup.md)，即使程序已连接或尚缺准确标题，也按该目标选路由。叶子指导会给缺字段的读取候选；已有PID可取得实际标题，再使用组合契约合并进程路径/端口归属、授权启动、窗口和真实页面读取。同环境检测复用，未知归属不重复启动。
- 目标仅核对既有CDP target与body：按 [连接观察](../../04-测试工具/ui-operations/docs/scenarios/application.connection.md) 选择读取；需要运行exe/PID与端口的绑定时回到真实实例路线。
- 目标是已接入实例中的业务操作：查 [软件 UI 操作工具](../../04-测试工具/ui-operations/README.md)，用case或目标分类选函数；接入状态只决定是否补连接条件，不替代业务目标分类。调用和取值经主库或任务登记函数。
- 安装路径、实例或实际端口未知：读 [启动与接入](references/启动与接入.md) 按当前缺项补定位；需要登录/UI控件或命令细节才查 [实操指南](references/UI与API操作.md)。不因一个参数尚缺而扫描完整安装包或产品源码。
- 测试网关：API / wire 与 UI 是独立通道；按 [UI 与 API 操作实操指南](references/UI与API操作.md) 的网关章节启动并验证；API 成功不能替代 UI 断言。
- 页面动作超时、主窗口被禁用或打开系统文件/文件夹选择器：按 [原生 Windows 弹窗](references/原生Windows弹窗.md) 先识别 UIA/Win32 通道与窗口归属，再处理已知类型并回读业务状态。

## 关键边界

1. 必要的现场核验可在具备契约的登记调用内完成。运行exe路径/进程和TCP归属、CDP target、账号/项目按目标分别取证；静态包哈希只标识文件，不能代替运行实例绑定；历史端口 9234 只是示例，不复用其他机器的绝对路径、session 或读值。
2. 真实 UI 优先 Electron CDP + Playwright。登录页可能是 `file://...`，主界面通常是 `dsh-app://app/`；按当前可见目标选 page，技能/专家/连接器可能在 iframe。遇到原生窗口则按实际限制处理。
3. 不抢占或直接结束其他 Agent/用户的实例；状态变更、样本准备与恢复按本轮授权执行并保留证据。函数返回成功不是产品通过。
4. 历史接入示例、窗口结构、市场和模型状态只作为参考。不能把旧批次观察当作当前版本的测试结论。

## 如何与其他技能组合

本轮 README → [探索性测试技能](../exploratory-testing/SKILL.md) → **本技能（当需要接入 TPT Work 时）** → [UI 操作工具](../../04-测试工具/ui-operations/README.md) 或对应 API 执行代码。已稳定连接时可跳过接入指南，直接查当前 case 所需函数。
