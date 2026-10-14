# 退出应用进程，为重置或收尾做准备

[返回接入与环境](../modules/application.md)

已有application.open返回的processInfo直接复用其PID/path/processStartTimeUtc；缺身份时才用readState并核对准确exe。application.quit明确终止绑定进程树，可能丢失未保存状态，调用者先确认退出授权和无未完成业务。只有exited=true且实际进程消失才可移动状态目录；WM_CLOSE可能仅进入托盘，browser.close仅断开客户端。未知或其他实例拒绝，不临时改用模糊进程名强杀。

| 候选函数 | 用途 |
|---|---|
| `application.quit` | 为重置或收尾终止准确绑定的应用进程树并回读全部退出；不以关闭窗口、进入托盘或断开CDP代替退出 |
| `nativeWindow.readState` | 按真实PID读取Win32窗口身份（标题、HWND、启动时间）与最小化/可见/前台状态；不把CDP可达当显示 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse application.quit`；场景内检索：`--find "关键词" --route application.quit --limit 3`。
