# 对话、任务、会话与权限

[返回功能索引](../功能索引.md) · [调用与记录](../调用与记录.md)

本页用于选函数。选中后只读一个函数的参数契约：

```powershell
node 04-测试工具/ui-operations/call.mjs --describe conversation.readSortMenu
```

参数必须以 `--describe` 返回的 schema 为准；本页“必填”只用于快速筛选。`--list` 的输出包含描述，适合关键词搜索。

**选用提醒**：当前任务权限用 `readTaskPermissionOptions/setTaskPermission`，默认权限属于 settings。CDP 合成快捷键无响应不能直接推断原生快捷键坏。

## 侧栏 → 排序

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.readSortMenu` | 打开侧栏排序菜单读取文本 | 无 |
| `conversation.setSort` | 设置侧栏排序值并回读，可选恢复 | value |

## 侧栏 → 搜索

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.searchSessions` | 在真实搜索任务弹窗查询，读取该弹窗任务数和结果原文 | query |

## 插件 → 详情展开

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.readPluginCard` | 打开插件页读取卡片 aria-expanded；此为左侧插件页面的旧读法，不用于设置/内置插件，后者用 settings.listPluginCards/setPluginExpanded | 无 |

## 对话 → 权限审批

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.decideApproval` | 处理对话内权限审批（允许一次/拒绝） | 无 |

## 对话 → 项目 → 发现实际控件

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.readProjectControls` | 读取可见项目控件的实际标签，保留HTML，不能拿隐藏的侧栏新建按钮当选择项目 | 无 |

## 对话 → 项目 → 已有选项

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.readProjectOptions` | 读取当前已有项目菜单与身份属性，关闭菜单，不添加项目 | 无 |

## 对话 → composer 菜单

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.readComposerMenu` | 在 composer 输入 @ 或 + 并读取弹出菜单项是否匹配 | trigger, wantPattern |

## 对话与任务 → 创建与配置

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.newTask` | 从新建任务入口建立任务，可选选择已有项目；读取编辑器可见可编辑、当前模型与推理等级、会话身份 | 无 |

## 对话与任务 → 当前任务权限

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.readTaskPermissionOptions` | 读取当前任务访问模式与可见菜单选项；不修改默认权限 | 无 |
| `conversation.setTaskPermission` | 只修改当前任务访问模式，记录前后值与会话身份 | value |

## 对话与任务 → 回复展示

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.readTaskState` | 读取当前会话终态：可见运行中指示数量、助手最终正文、助手气泡内代码块文本、产物卡数量 | 无 |
| `conversation.sendMessage` | 向 composer 填写文本并发送，等待终态后读取助手最终正文 | text |

## 对话与任务 → 文件交付

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.readArtifact` | 读取产物卡实际资源路径是否等于目标文件绝对路径，并读取磁盘文件内容 | deliverPath |

## 对话与任务 → 执行详情

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.readToolDetail` | 打开工具详情弹窗读取完整输出与容器可滚动性，结束时关闭弹窗 | 无 |
| `conversation.readToolTrace` | 读取本轮轨迹中的工具记录文本与输出容器可滚动性 | 无 |
| `conversation.readVisibleToolCalls` | 读取当前会话中可见的工具调用记录数量 | 无 |
| `conversation.readWorkSteps` | 读取已完成工作步骤默认折叠状态；展开后读取可见工具记录与嵌套聚合层级 | 无 |

## 对话与任务 → 状态与提醒

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.listSessionRows` | 读取侧栏会话行列表 | 无 |
| `conversation.markUnread` | 通过会话行菜单标记为未读 | 无 |
| `conversation.openSession` | 进入指定会话（点击其侧栏行） | title |
| `conversation.readUnreadBadge` | 读取会话行的未读标记数量 | title |

## 更多 → 帮助反馈

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.openHelpFeedback` | 点击更多→帮助/反馈并读取帮助目标是否打开 | 无 |

## 设置 → 代码工作工具

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.readTraceVisible` | 读取当前任务轨迹入口是否可见 | 无 |

## 设置 → 快捷键

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.openSearchShortcut` | 按下搜索会话快捷键并读取搜索面板可见状态 | 无 |

## 设置 → 网页链接

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.openLinkInReply` | 点击助手回复中 href 含指定片段的真实锚点 | hrefPart |
| `conversation.readLinkLog` | 读取链接夹具请求日志（路径串或 UA 判定） | file, mode |
| `conversation.readSidePanelVisible` | 读取应用内侧边栏/浏览器面板是否可见 | 无 |

## 设置 → 用量展示

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.readUsageFooter` | 读取 composer 页脚用量展示文本及详细字段可见性 | 无 |

## 自动化任务 → 推荐预填

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.clickAutomationCase` | 打开自动化任务页读案例提示词，点击后读 composer 预填 | title |

## conversation → clearDraft

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.clearDraft` | 清空当前草稿并回读 | 无 |

## conversation → closeDialogs

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.closeDialogs` | 有限关闭页面内弹窗并确认 | 无 |

## conversation → readCompletion

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.readCompletion` | 绑定session与唯一回复，读取已完成工作终态 | sessionId, replyText |

## conversation → readComposer

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.readComposer` | 读取编辑器、草稿、引用、模型与项目 | 无 |

## conversation → readDialogs

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `conversation.readDialogs` | 读取主页面及iframe中的弹窗 | 无 |

## 找不到需要的操作

先用同义关键词执行 `--list` 并检查候选函数是否含准备或恢复动作。确实不足时按 [扩展与边界](../扩展与边界.md) 留存任务函数；不要用近似函数偷偷改变测试目标。
