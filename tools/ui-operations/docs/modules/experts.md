# 专家

[返回功能索引](../功能索引.md) · [调用与记录](../调用与记录.md)

本页用于选函数。选中后只读一个函数的参数契约：

```powershell
node tools/ui-operations/call.mjs --describe experts.chooseConflict
```

参数必须以 `--describe` 返回的 schema 为准；本页“必填”只用于快速筛选。`--list` 的输出包含描述，适合关键词搜索。

**选用提醒**：末尾真实可见使用 `scrollPromptToEnd`；不要仅检查整段文字包含末尾标记。编辑要独立验证确认前不写入、确认后实际写入和文件恢复。

## 专家 → 冲突与异常包

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `experts.chooseConflict` | 在专家同名冲突弹窗中选择 覆盖/副本 | option |
| `experts.readAgentDirFiles` | 读取安装目录内 agent.md 与 metadata.json 是否均存在 | internalName |
| `experts.readFileExists` | 读取文件是否存在（channel=file） | path |
| `experts.readInstallPaths` | 读取指定内部名对应的完整安装路径 | internalNames |
| `experts.readPaths` | 分别读取若干完整绝对路径（channel=file） | paths |
| `experts.submitAndReadFeedback` | 提交专家目录导入并读取列表数量(前/后)与拒绝反馈；kind 决定反馈判据 | dirPath, kind |
| `experts.submitImport` | 提交专家目录导入并读取同名冲突弹窗（不选择处理方式） | dirPath |

## 专家 → 创建入口

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `experts.startCreate` | 点击创建专家并读取创建专家模式标识 | 无 |

## 专家 → 导入入口

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `experts.readImportDialogFolderInput` | 打开导入专家 dialog 读取 webkitdirectory 输入 | 无 |

## 专家 → 导入与来源

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `experts.importDirectory` | 提交专家目录导入，可处理同名冲突(副本/覆盖)；返回冲突弹窗文本与卡片存在状态 | dirPath, displayName |
| `experts.listAgentDirs` | 列出本机已安装专家目录名 | 无 |
| `experts.readCard` | 读取本轮专家卡片标题/版本/来源/运行位置与存在状态 | displayName |
| `experts.readImportDialog` | 打开专家导入弹窗并读取目录(webkitdirectory)与zip input 数量 | 无 |

## 专家 → 对话编辑

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `experts.editSend` | 在编辑会话发送消息并等待终态，返回助手正文 | text |
| `experts.startEdit` | 从专家详情进入对话编辑会话，读取引用/编辑模式/左侧导航 | displayName |

## 专家 → 实际调用

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `experts.readTraceExpertContent` | 读取本轮专家调用轨迹中的专家正文注入记录（限定轨迹表格） | 无 |
| `experts.useExpert` | 新建会话后经 使用 引入本轮专家引用；返回改前/改后会话身份与引用名 | displayName |
| `experts.useExpertRequest` | 发送专家固定回复规则请求并读取终态与用户请求 | text, answer |

## 专家 → 外部文件更新

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `experts.readFileContent` | 读取本机已安装文件内容（channel=file） | path |
| `experts.readInstalledFileHashes` | 读取本机已安装文件的 SHA256（channel=file） | paths |
| `experts.readValidationFeedback` | 打开专家列表读取本轮对象的坏配置校验反馈 | displayName |

## 专家 → 外置元数据

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `experts.readMetadataField` | 读取安装 metadata.json 的指定字段 | path, field |

## 专家 → 详情阅读

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `experts.readDetail` | 打开专家详情并读取提示词正文、可编辑元素数、推荐问题、目录入口按钮数 | displayName |

## experts → scrollPromptToEnd

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `experts.scrollPromptToEnd` | 滚动指定专家提示词并验证末尾标记处于可视裁剪区 | displayName, endMarker |

## 找不到需要的操作

先用同义关键词执行 `--list` 并检查候选函数是否含准备或恢复动作。确实不足时按 [扩展与边界](../扩展与边界.md) 留存任务函数；不要用近似函数偷偷改变测试目标。
