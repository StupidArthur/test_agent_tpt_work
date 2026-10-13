# 读取窗口身份、显示状态与恢复

[返回原生Windows窗口](../modules/nativeWindow.md)

先readState动态取得PID、HWND、标题和启动时间；需要显示时才显式restore并回读。visible不证明未被遮挡，未知归属或陈旧绑定拒绝动作。

| 候选函数 | 用途 |
|---|---|
| `nativeWindow.readState` | 按真实PID读取Win32窗口身份（标题、HWND、启动时间）与最小化/可见/前台状态；不把CDP可达当显示 |
| `nativeWindow.restore` | 显式恢复已授权、动态身份绑定的隐藏或最小化窗口；动作后回读状态，前台请求可能被系统拒绝，不能证明无遮挡或业务通过 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse nativeWindow.visibility`；场景内检索：`--find "关键词" --route nativeWindow.visibility --limit 3`。
