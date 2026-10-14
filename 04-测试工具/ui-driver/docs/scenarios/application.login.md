# 登录页读取与账号密码登录

[返回接入与环境](../modules/application.md)

缺登录页字段先读取，再登录；密码只由本地credentialsPath读取，不把凭据写进参数或证据。 来源smoketest-1012，迁库版本仅静态复核；需要时查看单函数契约。

| 候选函数 | 用途 |
|---|---|
| `application.readLoginPage` | 读取登录页(welcome.html)实际结构：URL/正文/输入框/页签/复选框/按钮，只读，供定位用。 |
| `application.loginWithPassword` | 在登录页执行账号密码登录：选tab、填用户名/密码、勾选记住密码与协议、点击登录，读取提交前后真实状态与结果。密码从credentialsPath读取并脱敏。 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse application.login`；场景内检索：`--find "关键词" --route application.login --limit 3`。
