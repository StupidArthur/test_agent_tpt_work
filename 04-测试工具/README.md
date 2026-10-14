# 工具入口

[返回产品功能导航](../00-产品特性与操作导航/README.md)

新环境先调用 [执行环境检测工具集](environment-check/README.md)，检测必需工具并读取返回的使用指南；同一环境后续复用，工具、PATH、宿主、权限或项目依赖变化后更新。大型任务编写系统命令前按本环境指南选择兼容写法。

产品操作使用 [软件 UI 操作工具](ui-operations/README.md)，服务于本仓库的 TPT Work。

1. 首次接入读工具快速开始；已接入跳过。
2. 有case编号查 --plan，无编号用 --find 找少量候选。
3. 用 --describe 查单函数契约，再调用、取值和恢复。

业务函数位于 ui-operations/business/；CDP、定位和记录位于 automation/。文档、参数登记、用例映射分别在 docs/、business/catalog.json、coverage/。

tpt-work/ 只有历史脚本转发入口，真实实现统一放 ui-operations/；新任务不在兼容目录添加函数。钉钉发送函数属于 [通知技能](../03-测试技能/dingtalk-notify/SKILL.md)，只有用户要求发送时使用。

## 仓库导航维护

运行 `node 04-测试工具/ui-operations/maintenance/check-navigation.mjs`，检查根入口、00 全部功能页和 01～06 入口的本地链接文件目标及受保护夹具哈希；不检查标题锚点或执行产品。结果写入 `.review/00-navigation-check.json`。
