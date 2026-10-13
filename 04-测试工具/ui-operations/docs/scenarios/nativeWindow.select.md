# 操作已识别文件/文件夹选择器

[返回原生Windows窗口](../modules/nativeWindow.md)

仅处理已识别的选择器结构；act需要显式动作和最新身份参数。成功返回不代表项目创建通过，必须再读页面路径和业务对象。

| 候选函数 | 用途 |
|---|---|
| `nativeWindow.act` | 显式操作已识别选择器：写入存在的绝对路径、确认或取消；校验进程启动时间和标题，回读窗口状态，不代表业务通过；Edit缺ValuePattern时用有界WM_GETTEXT真实回读并记录取值渠道 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse nativeWindow.select`；场景内检索：`--find "关键词" --route nativeWindow.select --limit 3`。
