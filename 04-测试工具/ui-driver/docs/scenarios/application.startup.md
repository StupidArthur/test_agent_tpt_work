# 复用或授权启动明确应用

[返回接入与环境](../modules/application.md)

新环境工具版本只检测一次，同环境有效结果复用。已知准确exe/标题/端口时直接查application.open契约并调用；进程路径/启动时间、端口归属、窗口与实际CDP目标在调用内分别核验留证，不在前面重复裸shell窗口或/json/list预检。已知PID但缺准确标题时，先用nativeWindow.readState读取实际标题/HWND，再绑定唯一授权主窗口；有歧义停止猜测，不扫描安装包或日志推断标题。CDP需实际本机端口及URL前缀；旧实例无CDP或端口归属不一致时拒绝重复启动。ensureVisible仅在需要显示且有授权时使用。ready只证明绑定窗口已观察、请求CDP时唯一目标的非空body可读；不能推出业务完成、无模态阻塞、获焦点或无遮挡。看实际原生状态、CDP body和分阶段机器耗时。

| 候选函数 | 用途 |
|---|---|
| `application.open` | 合并明确目标的进程/端口归属、复用或授权启动、原生窗口状态与CDP真实目标读取；可显式恢复显示，返回机器阶段耗时，不重复环境版本检查、不结束旧实例；直接返回实际端口归属和唯一目标计数 |
| `nativeWindow.readState` | 按真实PID读取Win32窗口身份（标题、HWND、启动时间）与最小化/可见/前台状态；不把CDP可达当显示 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse application.startup`；场景内检索：`--find "关键词" --route application.startup --limit 3`。
