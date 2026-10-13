# 发现和读取原生窗口

[返回原生Windows窗口](../modules/nativeWindow.md)

先probe或list，再用describe读取动态句柄。扫描失败不能记为无弹窗；未知窗口只取证。

| 候选函数 | 用途 |
|---|---|
| `nativeWindow.probe` | 按PID发现原生模态窗口；区分未发现与通道失败，返回窗口、owner及UIA观察，不连接CDP |
| `nativeWindow.list` | 列出目标PID可访问的UIA窗口（包括DOM窗口候选），不操作窗口 |
| `nativeWindow.describe` | 读取动态窗口句柄的控件、真实值及进程启动身份，区分选择器候选和未知窗口 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse nativeWindow.inspect`；场景内检索：`--find "关键词" --route nativeWindow.inspect --limit 3`。
