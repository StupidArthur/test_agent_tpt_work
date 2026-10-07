# 设置与插件

[返回功能索引](../功能索引.md) · [调用与记录](../调用与记录.md)

本页用于选函数。选中后只读一个函数的参数契约：

```powershell
node tools/ui-operations/call.mjs --describe settings.closeSettings
```

参数必须以 `--describe` 返回的 schema 为准；本页“必填”只用于快速筛选。`--list` 的输出包含描述，适合关键词搜索。

**选用提醒**：插件使用 `listPluginCards/setPluginExpanded`。设置按初值→改动→效果→重开→恢复取证；checkbox 保存失败反馈应在关闭前读取。

## 设置 → 常规

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `settings.closeSettings` | 关闭设置弹窗 | 无 |
| `settings.readGeneral` | 读取常规初值：主题/语言/默认权限/字号，并读取场景预设选中值 | 无 |
| `settings.readSelect` | 读取某设置行选择器文本值 | section, label |
| `settings.setSelect` | 设置某设置行选择值并回读 | section, label, value |

## 设置 → 个人主页

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `settings.readProfileIdentity` | 读取个人主页身份字段是否均只读 | 无 |

## 设置 → 记忆与进化

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `settings.readRowToggle` | 按设置行标签读取开关/复选框状态 | section, label |
| `settings.readSwitch` | 读取某设置行内开关 aria-checked | section, label |
| `settings.readToastError` | 读取设置区可见的保存失败/错误提示 | 无 |
| `settings.setRowToggle` | 按设置行标签切换开关/复选框并回读改前/改后 | section, label |

## 设置 → 快捷键

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `settings.readShortcut` | 读取某快捷键的规范化绑定文本 | label |
| `settings.setShortcut` | 录制并保存某快捷键的绑定 | label, combo |

## 设置 → 快捷键 → 读取实际行

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `settings.listShortcuts` | 读取独立快捷键dialog的实际标签与组合，避免猜行名 | 无 |

## 设置 → 默认场景

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `settings.setScene` | 设置场景预设并读取改后值 | value |

## 设置 → 默认权限

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `settings.readComposerLabels` | 读取当前空白任务 composer 的权限标签、场景标签与助手正文字号 | 无 |
| `settings.setPermission` | 设置默认权限并读取改后值 | value |

## 设置 → 全项恢复核验

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `settings.readSnapshot` | 读取本轮可逆设置字段的规范化快照 | 无 |

## 设置 → 实验性功能

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `settings.readSwitchIndex` | 按分区内索引读取开关 aria-checked | section, index |
| `settings.setSwitch` | 切换某设置行内开关并回读改前/改后 | section, label |
| `settings.setSwitchIndex` | 按分区内索引切换开关并回读改前/改后 | section, index |

## 设置 → 外观

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `settings.readSurfaceBg` | 读取主题影响表面的 computed background-color | 无 |
| `settings.setTheme` | 设置主题并读取改后选中值 | value |

## 设置 → 语言

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `settings.readGeneralNav` | 读取设置左侧导航语言显示（英文下为 General） | 无 |
| `settings.setLanguage` | 设置语言 | value |

## 设置 → 字号

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `settings.setFontDelta` | 按 delta 调整字号并读取改后数值 | delta |

## settings → listPluginCards

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `settings.listPluginCards` | 读取内置插件卡片及初始折叠状态 | 无 |

## settings → readConversationAppearance

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `settings.readConversationAppearance` | 固定session及唯一回复正文，读取同一正文和容器计算颜色 | sessionId, replyText |

## settings → setPluginExpanded

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `settings.setPluginExpanded` | 指定插件展开/收起并回读详情 | label, expanded |

## 找不到需要的操作

先用同义关键词执行 `--list` 并检查候选函数是否含准备或恢复动作。确实不足时按 [扩展与边界](../扩展与边界.md) 留存任务函数；不要用近似函数偷偷改变测试目标。
