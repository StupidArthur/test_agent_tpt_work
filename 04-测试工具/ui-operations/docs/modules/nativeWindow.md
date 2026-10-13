# 原生Windows窗口

[返回目标索引](../功能索引.md)

选择当前操作意图，只读一个场景。此页不展开函数参数或实现。

| 要做什么 | 意图 | 下一份资料 |
|---|---|---|
| 发现和读取原生窗口 | 页面被模态窗口阻塞或触发系统选择器时，限定PID发现窗口、读取控件和身份 | [候选与指导](../scenarios/nativeWindow.inspect.md) |
| 操作已识别文件/文件夹选择器 | 依据describe的PID、句柄、标题和进程启动时间，写路径、确认或取消并回读 | [候选与指导](../scenarios/nativeWindow.select.md) |
| 读取窗口身份、显示状态与恢复 | 读取实际标题、HWND与启动时间；区分原生显示、最小化和前台，恢复已授权窗口 | [候选与指导](../scenarios/nativeWindow.visibility.md) |

命令行：`node 04-测试工具/ui-operations/call.mjs --browse nativeWindow`。

场景不匹配时返回目标索引，或 `--find "业务词" --module nativeWindow --limit 3`。找不到再按 [扩展与边界](../扩展与边界.md) 核对缺口。
