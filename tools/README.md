# 工具入口

当前主要工具是 [软件 UI 操作工具](ui-operations/README.md)，服务于本仓库的 TPT Work。

1. 首次接入读工具快速开始；已接入跳过。
2. 有case编号查 --plan，无编号用 --find 找少量候选。
3. 用 --describe 查单函数契约，再调用、取值和恢复。

业务函数位于 ui-operations/business/；CDP、定位和记录位于 automation/。文档、参数登记、用例映射分别在 docs/、business/catalog.json、coverage/。

tpt-work/ 只有历史脚本转发入口，真实实现统一放 ui-operations/；新任务不在兼容目录添加函数。钉钉发送函数属于 [通知技能](../skills/dingtalk-notify/SKILL.md)，只有用户要求发送时使用。
