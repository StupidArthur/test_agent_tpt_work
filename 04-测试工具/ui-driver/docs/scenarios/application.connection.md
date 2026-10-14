# 核对连接与当前详情身份

[返回接入与环境](../modules/application.md)

已启动时核对连接；启动与安装定位走 TPT Work 接入技能。详情身份读取不能替代连接核验。

| 候选函数 | 用途 |
|---|---|
| `application.inspectConnection` | 核对CDP目标、主页面及安装包哈希 |
| `application.readDetailIdentity` | 读取当前详情的技术name、版本与来源 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse application.connection`；场景内检索：`--find "关键词" --route application.connection --limit 3`。
