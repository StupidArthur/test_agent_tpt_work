# 启动与停止本轮链接服务

[返回夹具、备份、文件与服务](../modules/fixtures.md)

复用本次返回的 URL、端口与日志；只停止本轮拥有的服务。

| 候选函数 | 用途 |
|---|---|
| `fixtures.startLinkServer` | 启动本轮loopback链接夹具 |
| `fixtures.stopLinkServer` | 核对并停止本轮链接夹具 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse fixtures.server`；场景内检索：`--find "关键词" --route fixtures.server --limit 3`。
