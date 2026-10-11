# 按行或索引读取和修改设置

[返回设置与插件](../modules/settings.md)

优先实际行标签；没有标签时才用分区索引，先核对真实控件类型与初值。

| 候选函数 | 用途 |
|---|---|
| `settings.readSwitch` | 读取某设置行内开关 aria-checked |
| `settings.setSwitch` | 切换某设置行内开关并回读改前/改后 |
| `settings.readSelect` | 读取某设置行选择器文本值 |
| `settings.setSelect` | 设置某设置行选择值并回读 |
| `settings.readSwitchIndex` | 按分区内索引读取开关 aria-checked |
| `settings.setSwitchIndex` | 按分区内索引切换开关并回读改前/改后 |
| `settings.readRowToggle` | 按设置行标签读取开关/复选框状态 |
| `settings.setRowToggle` | 按设置行标签切换开关/复选框并回读改前/改后 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse settings.controls`；场景内检索：`--find "关键词" --route settings.controls --limit 3`。
