# 接入与环境

[返回目标索引](../功能索引.md)

选择当前操作意图，只读一个场景。此页不展开函数参数或实现。

| 要做什么 | 意图 | 下一份资料 |
|---|---|---|
| 核对连接与当前详情身份 | 观察 | [候选与指导](../scenarios/application.connection.md) |
| 复用或授权启动明确应用 | 明确exe的打开、复用或显示目标；缺标题等输入按叶子指导读取 | [候选与指导](../scenarios/application.startup.md) |
| 登录页读取与账号密码登录 | 登录页读取与账号密码登录 | [候选与指导](../scenarios/application.login.md) |
| 首页账号与退出登录 | 首页账号与退出登录 | [候选与指导](../scenarios/application.account.md) |
| 退出应用进程，为重置或收尾做准备 | 已授权退出本轮准确实例，不是关闭窗口或断开CDP | [候选与指导](../scenarios/application.quit.md) |

命令行：`node 04-测试工具/ui-driver/call.mjs --browse application`。

场景不匹配时返回目标索引，或 `--find "业务词" --module application --limit 3`。找不到再按 [扩展与边界](../扩展与边界.md) 核对缺口。
