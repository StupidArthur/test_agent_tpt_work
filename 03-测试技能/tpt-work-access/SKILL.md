---
name: tpt-work-access
description: 在测试中需要定位、启动、连接、操作 TPT Work 的真实 UI 或 API 网关时使用；覆盖 EXE、Electron CDP/Playwright、工具调用和接入排障。
---

# TPT Work 接入与操作

**本技能只负责产品专属接入和操作通道。** 测试设计、检查点执行、结果取证与审核由 [exploratory-testing](../exploratory-testing/SKILL.md) 和本轮任务 README 负责，不在此复制一套测试规则。

## 按状态接入

- 已启动、已连接：优先查 [软件 UI 操作工具](../../04-测试工具/ui-operations/README.md)，用 `--plan <case>` 或 `--find` 找现有函数，`--describe` 核对参数和能读取的实际值。调用和取值走主工具库或本任务登记的函数。
- 尚未启动、CDP 不可用、目标不确定：先读 [启动与接入](references/启动与接入.md)，需要 PowerShell 命令、登录/UI 控件细节时再读 [UI 与 API 操作实操指南](references/UI与API操作.md)。
- 测试网关：API / wire 与 UI 是独立通道；按 [UI 与 API 操作实操指南](references/UI与API操作.md) 的网关章节启动并验证；API 成功不能替代 UI 断言。

## 关键边界

1. 先核验真实 EXE/应用包、已有进程与端口、CDP target、账号/项目和任务归属；历史端口 9234 只是示例，不复用其他机器的绝对路径、session 或读值。
2. 真实 UI 优先 Electron CDP + Playwright。登录页可能是 `file://...`，主界面通常是 `dsh-app://app/`；按当前可见目标选 page，技能/专家/连接器可能在 iframe。遇到原生窗口则按实际限制处理。
3. 不抢占或直接结束其他 Agent/用户的实例；状态变更、样本准备与恢复按本轮授权执行并保留证据。函数返回成功不是产品通过。
4. 历史接入示例、窗口结构、市场和模型状态只作为参考。不能把旧批次观察当作当前版本的测试结论。

## 如何与其他技能组合

本轮 README → [探索性测试技能](../exploratory-testing/SKILL.md) → **本技能（当需要接入 TPT Work 时）** → [UI 操作工具](../../04-测试工具/ui-operations/README.md) 或对应 API 执行代码。已稳定连接时可跳过接入指南，直接查当前 case 所需函数。
