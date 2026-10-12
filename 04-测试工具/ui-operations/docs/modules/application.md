# 接入与环境

[返回目标索引](../功能索引.md)

选择当前操作意图，只读一个场景。此页不展开函数参数或实现。

| 要做什么 | 意图 | 下一份资料 |
|---|---|---|
| 核对连接与当前详情身份 | 观察 | [候选与指导](../scenarios/application.connection.md) |
| 登录页读取与账号密码登录 | 登录页读取与账号密码登录 | [候选与指导](../scenarios/application.login.md) |
| 首页账号与退出登录 | 首页账号与退出登录 | [候选与指导](../scenarios/application.account.md) |

命令行：`node 04-测试工具/ui-operations/call.mjs --browse application`。

场景不匹配时返回目标索引，或 `--find "业务词" --module application --limit 3`。找不到再按 [扩展与边界](../扩展与边界.md) 核对缺口。
