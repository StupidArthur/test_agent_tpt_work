# 保存错误、快照与关闭设置

[返回设置与插件](../modules/settings.md)

关闭前捕获保存错误；快照核验恢复，关闭设置本身不恢复值。

| 候选函数 | 用途 |
|---|---|
| `settings.readToastError` | 读取设置区可见的保存失败/错误提示 |
| `settings.readSnapshot` | 读取本轮可逆设置字段的规范化快照 |
| `settings.closeSettings` | 关闭设置弹窗 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse settings.recovery`；场景内检索：`--find "关键词" --route settings.recovery --limit 3`。
