# 首页账号与退出登录

[返回接入与环境](../modules/application.md)

账号菜单读取会开关菜单；退出会中断账号下任务，按本轮授权执行。 来源smoketest-1012，迁库版本仅静态复核；需要时查看单函数契约。

| 候选函数 | 用途 |
|---|---|
| `application.readHomeAccount` | 在主界面定位左下角账号显示：返回等于 expectedUsername 的可见元素与左下角候选元素及其位置。只读。 |
| `application.readAccountMenu` | 打开主界面左下角账号菜单并读取菜单项文本/角色，随后按 Escape 关闭，不点击任何项。只读。 |
| `application.logout` | 点击左下角账号菜单中的退出登录并读取退出后真实页面状态：登录页是否出现、是否有确认弹窗；如有确认弹窗则点击允许的确认按钮。 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse application.account`；场景内检索：`--find "关键词" --route application.account --limit 3`。
